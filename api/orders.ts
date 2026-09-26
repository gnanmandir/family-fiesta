import type { IncomingMessage, ServerResponse } from 'http';

interface TursoArg {
  type: 'text' | 'integer' | 'float' | 'null';
  value?: string;
}

function formatArg(val: any): TursoArg {
  if (val === null || val === undefined) return { type: 'null' };
  if (typeof val === 'number') {
    return Number.isInteger(val)
      ? { type: 'integer', value: String(val) }
      : { type: 'float', value: String(val) };
  }
  if (typeof val === 'boolean') {
    return { type: 'integer', value: val ? '1' : '0' };
  }
  return { type: 'text', value: String(val) };
}

async function runTursoQuery<T = any>(
  tursoUrl: string,
  tursoToken: string,
  sql: string,
  args: any[] = []
): Promise<T[]> {
  const url = `${tursoUrl.replace(/\/+$/, '')}/v2/pipeline`;
  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: args.map(formatArg),
        },
      },
      { type: 'close' },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tursoToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Turso error (${res.status}): ${txt}`);
  }

  const json = await res.json();
  const execResult = json.results?.[0];
  if (execResult?.type === 'error') {
    throw new Error(execResult.error?.message || 'Turso execution error');
  }

  const resultObj = execResult?.response?.result;
  if (!resultObj || !resultObj.cols) return [];

  const cols = resultObj.cols.map((c: any) => c.name);
  const rows = resultObj.rows || [];

  return rows.map((row: any[]) => {
    const obj: any = {};
    cols.forEach((colName: string, idx: number) => {
      const cell = row[idx];
      obj[colName] = cell?.value !== undefined ? cell.value : null;
    });
    return obj as T;
  });
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const tursoUrl = (
    process.env.TURSO_DATABASE_URL ||
    process.env.VITE_TURSO_DATABASE_URL ||
    ''
  ).trim();
  const tursoToken = (
    process.env.TURSO_AUTH_TOKEN ||
    process.env.VITE_TURSO_AUTH_TOKEN ||
    ''
  ).trim();

  if (!tursoUrl || !tursoToken) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Database credentials not configured on server.' }));
    return;
  }

  // Parse Body
  let bodyData: any = req.body;
  if (!bodyData && req.method === 'POST') {
    try {
      const chunks: any[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      bodyData = JSON.parse(raw);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload.' }));
      return;
    }
  }

  try {
    if (req.method === 'POST') {
      const order = bodyData;
      if (!order || !order.studentId || !Array.isArray(order.items) || order.items.length === 0) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Missing required order fields or items.' }));
        return;
      }

      // 1. Check Ordering Status
      const statusRows = await runTursoQuery<{ value: string }>(
        tursoUrl,
        tursoToken,
        "SELECT value FROM app_settings WHERE key = 'ordering_status'"
      );
      if (statusRows.length > 0 && (statusRows[0].value === '0' || statusRows[0].value === 'false')) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Ordering is currently halted by administration.' }));
        return;
      }

      // 2. Validate Menu Items & Authoritative Prices
      const menuRows = await runTursoQuery<any>(
        tursoUrl,
        tursoToken,
        'SELECT id, name, price, is_available FROM menu_items'
      );
      let recalculatedTotal = 0;
      const validatedItems: any[] = [];

      for (const item of order.items) {
        const official = menuRows.find((m: any) => m.id === item.id);
        if (!official) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: `Invalid food item: ${item.name || item.id}` }));
          return;
        }
        if (official.is_available === 0 || official.is_available === '0') {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: `Item "${official.name}" is currently sold out.` }));
          return;
        }
        const qty = Math.max(1, parseInt(String(item.quantity || 1), 10));
        const price = Number(official.price) || 0;
        const total = price * qty;
        validatedItems.push({
          ...item,
          id: official.id,
          name: official.name,
          price,
          quantity: qty,
          total,
        });
        recalculatedTotal += total;
      }

      // 3. Authoritative Budget Check
      const role = order.orderType || 'parent';
      const tierRows = await runTursoQuery<{ key: string; value: string }>(
        tursoUrl,
        tursoToken,
        "SELECT key, value FROM app_settings WHERE key IN ('parent_tiers', 'student_tiers', 'staff_tiers', 'guest_tiers')"
      );
      const tierMap: Record<string, number[]> = {
        parent: [230, 230, 140, 80],
        student: [230],
        staff: [230],
      };
      tierRows.forEach((r) => {
        try {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (r.key === 'parent_tiers') tierMap.parent = parsed;
            if (r.key === 'student_tiers') tierMap.student = parsed;
            if (r.key === 'staff_tiers' || r.key === 'guest_tiers') tierMap.staff = parsed;
          }
        } catch (e) {}
      });

      const tiers = role === 'student' ? tierMap.student : (role === 'staff' || role === 'guest') ? tierMap.staff : tierMap.parent;
      const count = Math.max(1, parseInt(String(order.peopleCount || 1), 10));
      let officialBudget = 0;
      if (role === 'parent') {
        for (let i = 0; i < Math.min(count, tiers.length); i++) {
          officialBudget += (tiers[i] || 0);
        }
      } else {
        officialBudget = (tiers[0] || 230) * count;
      }

      if (recalculatedTotal > officialBudget) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: `Order total (₹${recalculatedTotal}) exceeds allowed budget (₹${officialBudget}).`,
          })
        );
        return;
      }

      // 4. Insert Verified Order
      const itemsJson = JSON.stringify(validatedItems);
      const now = new Date();
      const orderNum = order.orderNumber || 'FLM-2026-' + Math.floor(1000 + Math.random() * 9000);

      await runTursoQuery(
        tursoUrl,
        tursoToken,
        `INSERT INTO orders (order_number, student_id, student_name, parent_name, full_name, device_id, people_count, allowed_budget, items, total_amount, status, created_at, date_display, time_display, order_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNum,
          order.studentId,
          order.studentName || '',
          order.parentName || '',
          order.fullName || '',
          order.deviceId || '',
          count,
          officialBudget,
          itemsJson,
          recalculatedTotal,
          order.status || 'Pending',
          order.createdAt || now.toISOString(),
          order.dateDisplay || '',
          order.timeDisplay || '',
          role,
        ]
      );

      if (order.deviceId) {
        await runTursoQuery(
          tursoUrl,
          tursoToken,
          `INSERT OR REPLACE INTO device_locks (device_id, student_id, student_name, order_number, order_date)
           VALUES (?, ?, ?, ?, ?)`,
          [order.deviceId, order.studentId, order.studentName || '', orderNum, now.toISOString()]
        ).catch(() => {});
      }

      const finalOrder = {
        ...order,
        orderNumber: orderNum,
        items: validatedItems,
        totalAmount: recalculatedTotal,
        allowedBudget: officialBudget,
      };

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: finalOrder }));
      return;
    }

    res.statusCode = 405;
    res.end();
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err?.message || 'Server error processing order.' }));
  }
}
