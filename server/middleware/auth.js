// Admin authentication middleware
export function requireAdminAuth(req, res, next) {
  const adminPassword = req.headers['x-admin-password'] || req.query.adminPassword;
  
  if (adminPassword === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid admin credentials' });
  }
}
