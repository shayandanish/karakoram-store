import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { z } from 'zod';
import Staff from '../models/Staff.js';

const staffRole = z.enum(['orders_manager', 'catalog_manager', 'accounts_manager', 'content_manager']);
const staffUsername = z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9._-]+$/, 'Username may use letters, numbers, dots, underscores, and hyphens.');
const staffPassword = z.string().min(10, 'Use at least 10 characters for a staff password.').max(128);

const publicStaff = (staff) => ({
  _id: staff._id,
  username: staff.username,
  name: staff.name,
  role: staff.role,
  isActive: staff.isActive,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

export const adminGetStaff = async (req, res, next) => {
  try {
    const staff = await Staff.find().sort({ isActive: -1, username: 1 }).lean();
    res.json({ staff });
  } catch (error) {
    next(error);
  }
};

export const adminCreateStaff = async (req, res, next) => {
  try {
    const data = z.object({
      username: staffUsername,
      name: z.string().trim().min(2).max(100),
      password: staffPassword,
      role: staffRole,
    }).parse(req.body);
    const staff = await Staff.create({
      ...data,
      passwordHash: await bcrypt.hash(data.password, 12),
      isActive: true,
    });
    res.status(201).json({ staff: publicStaff(staff) });
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409);
      error.message = 'That staff username is already in use.';
    }
    next(error);
  }
};

export const adminSetStaffStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400);
      throw new Error('Invalid staff account id.');
    }
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const staff = await Staff.findById(req.params.id).select('+authVersion');
    if (!staff) {
      res.status(404);
      throw new Error('Staff account not found.');
    }
    if (staff.isActive !== isActive) {
      staff.isActive = isActive;
      staff.authVersion += 1;
      await staff.save();
    }
    res.json({ staff: publicStaff(staff) });
  } catch (error) {
    next(error);
  }
};

export const adminSetStaffRole = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400);
      throw new Error('Invalid staff account id.');
    }
    const { role } = z.object({ role: staffRole }).parse(req.body);
    const staff = await Staff.findById(req.params.id).select('+authVersion');
    if (!staff) {
      res.status(404);
      throw new Error('Staff account not found.');
    }
    if (staff.role !== role) {
      staff.role = role;
      staff.authVersion += 1;
      await staff.save();
    }
    res.json({ staff: publicStaff(staff) });
  } catch (error) {
    next(error);
  }
};

export const adminResetStaffPassword = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400);
      throw new Error('Invalid staff account id.');
    }
    const { password } = z.object({ password: staffPassword }).parse(req.body);
    const staff = await Staff.findById(req.params.id).select('+authVersion');
    if (!staff) {
      res.status(404);
      throw new Error('Staff account not found.');
    }
    staff.passwordHash = await bcrypt.hash(password, 12);
    staff.authVersion += 1;
    await staff.save();
    res.json({ staff: publicStaff(staff) });
  } catch (error) {
    next(error);
  }
};
