import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

export function requirePlanEditor(req, res, next) {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'superuser') {
    return res.status(403).json({ error: 'Недостаточно прав для управления планами' });
  }
  next();
}

export function requireUserManager(req, res, next) {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'superuser') {
    return res.status(403).json({ error: 'Недостаточно прав для управления пользователями' });
  }
  next();
}
