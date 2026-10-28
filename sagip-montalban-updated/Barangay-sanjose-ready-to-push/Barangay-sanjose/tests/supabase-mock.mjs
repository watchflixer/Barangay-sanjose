/**
 * An in-memory stand-in for the deployed Supabase project.
 *
 * The sandbox cannot reach guxzibsrfyfiuqsgcgyt.supabase.co, so the browser
 * tests route that origin here and replay the same RPC contract the SQL
 * functions implement: pending community reports stay private, resolve flags
 * wait for an admin, and hidden categories vanish from public_feed().
 */
export const SUPABASE_ORIGIN = 'https://guxzibsrfyfiuqsgcgyt.supabase.co';

export const baseReport = (id, changes = {}) => ({
  id,
  type: 'flood',
  title: `Incident ${id}`,
  street_name: 'Riverside Drive',
  sitio: 'Kasiglahan',
  lat: 14.7468,
  lng: 121.1378,
  status: 'active',
  severity: 'high',
  description: 'Knee-deep water near the dike.',
  reported_by: 'Maria Santos',
  contact_number: '09171234567',
  reporter_email: 'maria.santos@gmail.com',
  photo_url: '',
  affected_households: '',
  evacuation_center: '',
  time_reported: 'Just now',
  reported_at: '2026-10-29T08:00:00.000Z',
  last_updated: '2026-10-29T08:00:00.000Z',
  updates_count: 1,
  show_reporter: false,
  review_status: 'accepted',
  decline_reason: null,
  reviewed_at: '2026-10-29T08:00:00.000Z',
  deleted_at: null,
  source: 'admin',
  created_at: '2026-10-29T08:00:00.000Z',
  ...changes,
});

export function createBackend(reports = []) {
  const state = {
    reports: [...reports],
    flags: [],
    hiddenTypes: [],
    events: [],
    siteVisits: 5000,
    calls: [],
  };
  let counter = 0;
  const nextId = (prefix) => `${prefix}-${++counter}`;
  const event = (report, action, actor) =>
    state.events.unshift({
      id: nextId('event'),
      reportId: report.id,
      title: report.title,
      action,
      actor,
      at: new Date().toISOString(),
    });
  const publicReport = (report) => {
    const { contact_number, reporter_email, ...rest } = report;
    return {
      ...rest,
      reported_by: report.show_reporter ? report.reported_by : 'Anonymous reporter',
      pending_resolve_flags: state.flags.filter(
        (flag) => flag.reportId === report.id && flag.status === 'pending',
      ).length,
    };
  };

  const rpc = (name, args) => {
    const password = args?.p_password;
    const requireAdmin = () => {
      if (password !== 'admin') throw new Error('Admin access is required.');
    };
    switch (name) {
      case 'public_feed': {
        const visible = state.reports
          .filter(
            (report) =>
              !report.deleted_at &&
              report.review_status === 'accepted' &&
              !state.hiddenTypes.includes(report.type),
          )
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return { reports: visible.map(publicReport), hidden_types: [...state.hiddenTypes] };
      }
      case 'admin_bundle': {
        requireAdmin();
        return {
          reports: [...state.reports].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
          history: [...state.events],
          flags: state.flags.map((flag) => ({
            ...flag,
            title: state.reports.find((report) => report.id === flag.reportId)?.title ?? flag.reportId,
          })),
          hidden_types: [...state.hiddenTypes],
        };
      }
      case 'admin_login':
        return password === 'admin';
      case 'increment_site_visit':
        state.siteVisits += 1;
        return state.siteVisits;
      case 'submit_report': {
        const payload = args.payload ?? {};
        if (!payload.photo_url) throw new Error('A photo of the hazard is required.');
        if (!/^(\+63|0)9\d{9}$/.test(String(payload.contact_number).replace(/[^0-9+]/g, '')))
          throw new Error('Enter a valid Philippine cellphone number (e.g. 09171234567).');
        if (!/@(gmail|googlemail)\.com$/i.test(String(payload.reporter_email)))
          throw new Error('Use your Google account (Gmail) address.');
        if (String(payload.reported_by ?? '').trim().length < 2)
          throw new Error('Enter your full name.');
        const id = nextId('hz-report');
        const report = baseReport(id, {
          ...payload,
          review_status: 'pending',
          source: 'community',
          reviewed_at: null,
          show_reporter: false,
          pending_resolve_flags: 0,
          created_at: new Date().toISOString(),
        });
        state.reports.unshift(report);
        event(report, 'Hazard report submitted', 'reporter');
        return id;
      }
      case 'flag_resolved': {
        const report = state.reports.find((item) => item.id === args.p_report_id);
        if (!report || report.deleted_at || report.review_status !== 'accepted')
          throw new Error('This incident is not available for a resolve request.');
        if (report.status === 'resolved') throw new Error('This incident is already resolved.');
        if (state.flags.some((flag) => flag.reportId === report.id && flag.status === 'pending'))
          return report.id;
        state.flags.unshift({
          id: nextId('flag'),
          reportId: report.id,
          note: args.p_note ?? null,
          status: 'pending',
          createdAt: new Date().toISOString(),
          reviewedAt: null,
        });
        event(report, 'Resident flagged as resolved (awaiting admin)', 'public');
        return report.id;
      }
      case 'admin_change': {
        requireAdmin();
        const report = state.reports.find((item) => item.id === args.p_id);
        if (!report) throw new Error('That incident no longer exists.');
        const change = args.p_change ?? {};
        if (change.type === 'status') {
          report.status = change.value;
          event(report, `Status changed to ${change.value}`, 'admin');
        } else if (change.type === 'visibility') {
          report.show_reporter = !!change.value;
          event(report, change.value ? 'Reporter name made public' : 'Reporter name hidden', 'admin');
        } else if (change.type === 'delete') {
          report.deleted_at = new Date().toISOString();
          event(report, 'Removed from website (archived)', 'admin');
        } else if (change.type === 'restore') {
          report.deleted_at = null;
          event(report, 'Restored to website', 'admin');
        } else if (change.type === 'review') {
          report.review_status = change.value;
          report.decline_reason = change.value === 'declined' ? change.reason || null : null;
          report.reviewed_at = new Date().toISOString();
          event(
            report,
            change.value === 'accepted' ? 'Report accepted and published' : 'Report declined',
            'admin',
          );
        }
        return null;
      }
      case 'admin_create': {
        requireAdmin();
        const payload = args.payload ?? {};
        const id = nextId('hz-official');
        const report = baseReport(id, {
          ...payload,
          review_status: 'accepted',
          source: 'admin',
          created_at: new Date().toISOString(),
        });
        state.reports.unshift(report);
        event(report, 'Admin incident created and published', 'admin');
        return { id, created_at: report.created_at };
      }
      case 'admin_set_hidden_types': {
        requireAdmin();
        state.hiddenTypes = [...(args.p_types ?? [])];
        return state.hiddenTypes;
      }
      case 'admin_review_flag': {
        requireAdmin();
        const flag = state.flags.find((item) => item.id === args.p_flag_id);
        if (!flag) throw new Error('That request no longer exists.');
        flag.status = args.p_decision;
        flag.reviewedAt = new Date().toISOString();
        const report = state.reports.find((item) => item.id === flag.reportId);
        if (args.p_decision === 'accepted' && report) {
          report.status = 'resolved';
          event(report, 'Resolve request accepted by admin', 'admin');
        } else if (report) {
          event(report, 'Resolve request ignored by admin', 'admin');
        }
        return null;
      }
      default:
        throw new Error(`Unexpected RPC ${name}`);
    }
  };

  /** Wires the mock into a Playwright browser context. */
  const install = async (context) => {
    await context.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'content-type': 'application/json',
      };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (url.pathname === '/rest/v1/site_visits') {
        return route.fulfill({
          status: 200,
          headers: { ...cors, 'content-range': '0-0/1' },
          body: JSON.stringify([{ id: 1, total: state.siteVisits, updated_at: new Date().toISOString() }]),
        });
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const name = url.pathname.split('/').pop();
        const args = request.postDataJSON?.() ?? {};
        state.calls.push({ name, args });
        try {
          const data = rpc(name, args);
          return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(data ?? null) });
        } catch (error) {
          return route.fulfill({
            status: 400,
            headers: cors,
            body: JSON.stringify({ message: error.message, code: '22023' }),
          });
        }
      }
      // Realtime sockets are unavailable here; the hooks refresh after each action.
      return route.abort();
    });
  };

  return { state, install, rpc };
}
