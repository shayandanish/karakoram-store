import jwt from 'jsonwebtoken';

/** Sign a JWT and set it as an httpOnly cookie */
export const sendTokenCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return token;
};

/** Clear the auth cookie */
export const clearTokenCookie = (res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
};
