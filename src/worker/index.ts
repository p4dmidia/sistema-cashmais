import { Hono } from "hono";
import { cors } from "hono/cors";
// import { getCookie, setCookie } from "hono/cookie";
// import { type UserProfile, type CashMaisUser } from "@/shared/types";
import affiliateApi from "@/worker/affiliate-api";
import affiliateAuth from "@/worker/affiliate-auth";
import companyApi from "@/worker/company-api";
import adminAuth from "@/worker/admin-auth";
import adminApi from "@/worker/admin-api";
import "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - optimized for production
app.use('*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin;
    }
    // Allow all .mocha.app domains and custom domains
    if (origin.includes('.mocha.app') || origin.includes('cashmais.net.br')) {
      return origin;
    }
    return origin;
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposeHeaders: ['Set-Cookie'],
}));

// Mount affiliate API routes
app.route('/', affiliateApi);

// Mount affiliate auth routes
app.route('/', affiliateAuth);

// Mount company API routes
app.route('/', companyApi);

// Mount admin routes
app.route('/', adminAuth);
app.route('/', adminApi);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Catch-all for undefined routes
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

export default app;
