import express from 'express';

const app = express();

// Routers: app -> apiRouter -> usersRouter -> ordersRouter
const apiRouter = express.Router();
const usersRouter = express.Router();
const ordersRouter = express.Router();

function authenticate(req, res, next) { next(); }
function auditLog(req, res, next) { next(); }

// ── Case 3: path-scoped middleware ─────────────────────────────────────
// Attaches `authenticate` to endpoints under `/profile` on usersRouter.
// It does NOT change the route path — only adds the middleware.
usersRouter.use('/profile', authenticate);
usersRouter.get('/profile', (req, res) => { res.send('profile'); });

// ── Case 2: child + grand-child routers ────────────────────────────────
// ordersRouter (grand-child) mounted under usersRouter (child).
ordersRouter.get('/:orderId', (req, res) => { res.send('order'); });
usersRouter.use('/:userId/orders', ordersRouter);

// ── Case 4: one handler bound to multiple paths ────────────────────────
// The same `listing` handler is registered at two different routes.
function listing(req, res) { res.send('listing'); }
apiRouter.get('/catalog', listing);
apiRouter.get('/inventory', listing);

// ── Case 5: a `.use('/unused', …)` with no effect ──────────────────────
// No endpoint on apiRouter lives under `/unused`, so this middleware never
// attaches to anything — the call is effectively a no-op for inventory.
apiRouter.use('/unused', auditLog);

// wire the child into the base router
apiRouter.use('/users', usersRouter);

// ── Case 1: base route for the whole app ───────────────────────────────
// Everything below apiRouter inherits the `/api` prefix.
app.use('/api', apiRouter);

// ────────────────────────────────────────────────────────────────────────
// Expected extracted endpoints (verified against the unified extractor):
//
//   GET /api/catalog                          -> listing            (case 1 + 4)
//   GET /api/inventory                         -> listing            (case 1 + 4)
//   GET /api/users/profile        mw=[authenticate]                  (case 1 + 3)
//   GET /api/users/:userId/orders/:orderId                           (case 1 + 2)
//
// Case 5 note: `apiRouter.use('/unused', auditLog)` produces NO endpoint and
// attaches `auditLog` to nothing — apiRouter has no route under `/unused`, so
// the call is a no-op in the inventory (auditLog appears on zero endpoints).
// ────────────────────────────────────────────────────────────────────────
