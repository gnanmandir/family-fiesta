import defaultLogo from '../assets/images/family_fiesta_logo_new.png';

/**
 * =====================================================================
 *                   EVENT REBRANDING & CONFIGURATION
 * ====================================================================
 * To use this portal for a new food festival or event in the future:
 * 
 * 1. Change the Event Name & Details below (e.g. name, year, titles).
 * 2. To change the logo: Drop your new event logo image into `src/assets/images/`
 *    and update the `import defaultLogo` line above or set `logo`.
 * 3. Update the browser tab title & favicon in `index.html` if desired.
 * ====================================================================
 */

export interface EventConfig {
  /** Short brand name of the event (e.g. "Family Fiesta") */
  name: string;
  /** Edition or year of the event (e.g. "2026") */
  year: string;
  /** Full official event name (e.g. "Family Fiesta 2026") */
  fullName: string;
  /** Subtitle or descriptor shown in Admin header */
  adminSubtitle: string;
  /** Title header printed on receipts */
  receiptTitle: string;
  /** Footer validity text printed on PDF vouchers */
  receiptFooter: string;
  /** Thank you message displayed on receipts */
  thankyouMessage: string;
  /** Notice shown when ordering is paused/closed */
  concludedNotice: string;
  /** Official logo asset */
  logo: string;
}

export const EVENT_CONFIG: EventConfig = {
  name: 'Family Fiesta',
  year: '2026',
  fullName: 'Family Fiesta 2026',
  adminSubtitle: 'Stall Operations & Reports',
  receiptTitle: 'FAMILY FIESTA - RECEIPT',
  receiptFooter: 'Valid only for the items specified above during Family Fiesta 2026.',
  thankYouMessage: 'Thank you for ordering from Family Fiesta!',
  concludedNotice: '🎪 Online Ordering Has Concluded for Family Fiesta 2026!',
  logo: defaultLogo,
};
