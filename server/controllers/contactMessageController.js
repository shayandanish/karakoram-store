import { z } from 'zod';
import ContactMessage from '../models/ContactMessage.js';
import { sendContactReplyEmail } from '../utils/mailer.js';

const contactMessageInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().default(''),
  message: z.string().trim().min(1).max(5000),
});

export const submitContactMessage = async (req, res, next) => {
  try {
    const data = contactMessageInput.parse(req.body);
    await ContactMessage.create(data);
    res.status(201).json({ message: 'Thanks for reaching out. Your message has been sent to our team.' });
  } catch (err) {
    next(err);
  }
};

export const adminGetContactMessages = async (req, res, next) => {
  try {
    const status = req.query.status;
    const filter = status && ['new', 'in_progress', 'resolved'].includes(status) ? { status } : {};
    const [messages, total, unread] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: 'new' }),
    ]);
    res.json({ messages, total, unread });
  } catch (err) {
    next(err);
  }
};

export const adminUpdateContactMessage = async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['new', 'in_progress', 'resolved']) }).parse(req.body);
    const message = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!message) {
      res.status(404);
      throw new Error('Contact message not found.');
    }
    res.json(message);
  } catch (err) {
    next(err);
  }
};

export const adminReplyToContactMessage = async (req, res, next) => {
  try {
    const { body } = z.object({ body: z.string().trim().min(1).max(5000) }).parse(req.body);
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      res.status(404);
      throw new Error('Contact message not found.');
    }

    try {
      await sendContactReplyEmail({ to: message.email, customerName: message.name, body });
    } catch (mailError) {
      console.error('[Contact inbox] Reply email failed:', mailError);
      res.status(502);
      throw new Error('The reply could not be emailed. Check the email service configuration and try again.');
    }

    message.replies.push({ body, sentAt: new Date(), sentBy: req.user?.name || req.user?.username || 'Store team' });
    if (message.status === 'new') message.status = 'in_progress';
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};
