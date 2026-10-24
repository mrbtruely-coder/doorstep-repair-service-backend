import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory service bookings store (or connect to DB)
const bookings = [];

// Configure nodemailer transporter using user's SMTP credentials
const smtpHost = process.env.BOOKINGS_EMAIL_HOST || process.env.SMTP_HOST || 'mail.doorstephub.com';
const smtpPort = parseInt(process.env.BOOKINGS_EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.BOOKINGS_EMAIL_USER || process.env.EMAIL_USER || 'bookings@doorstephub.com';
const smtpPass = process.env.BOOKINGS_EMAIL_PASS || process.env.EMAIL_PASS || 'jwT6NlDRBYh5';
const teamAlertEmail = process.env.DOORSTEP_TEAM_EMAIL || 'doorstephub@gmail.com';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Doorstep Repair Service API is active',
    smtpHost,
    smtpPort,
    smtpUser: smtpUser ? `${smtpUser.slice(0, 4)}***` : 'Not set',
    teamEmail: teamAlertEmail
  });
});

app.post('/api/book-service', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      city,
      locality,
      serviceType,
      preferredDate,
      preferredTime,
      address,
      notes
    } = req.body;

    if (!fullName || !phone || !city || !serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, phone, city, and serviceType are required.'
      });
    }

    const bookingId = 'DS-' + Date.now().toString().slice(-6);
    const resolvedLocality = locality || 'Central Hub Area';
    const newBooking = {
      bookingId,
      fullName,
      email: email || 'Not provided',
      phone,
      city,
      locality: resolvedLocality,
      serviceType,
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      preferredTime: preferredTime || 'Within 90 Minutes (Express Dispatch)',
      address: address || `${resolvedLocality}, ${city}`,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);

    let customerEmailSent = false;
    let teamEmailSent = false;
    let emailNotice = '';

    // 1. Email template for Customer (Simple English, user-friendly, clear)
    const customerHtml = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #008ba6 0%, #005a6f 100%); padding: 24px; border-radius: 8px; color: white; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;">Doorstep Repair Service</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Fast & Reliable Home Appliance Repair in ${city}</p>
        </div>

        <div style="padding: 24px 8px;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Your Booking is Confirmed! 🎉</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Hello <strong>${fullName}</strong>,<br/>
            Thank you for booking with Doorstep Repair Service! We have received your repair request. Our certified technician will visit your location shortly.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #008ba6; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              Booking Details
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #64748b;">Booking ID:</td><td style="color: #008ba6; font-weight: 800; font-size: 15px;">#${bookingId}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Service Needed:</td><td style="font-weight: 600;">${serviceType}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">City & Area:</td><td><strong>${city}</strong> (${resolvedLocality})</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Scheduled Slot:</td><td>${newBooking.preferredTime}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Service Address:</td><td>${newBooking.address}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Your Mobile:</td><td>${phone}</td></tr>
            </table>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
              <strong>Need quick support or want to reschedule?</strong><br/>
              Call or WhatsApp our support team directly at: <a href="tel:9515661677" style="color: #008ba6; font-weight: bold; text-decoration: none;">+91 9515661677</a>
            </p>
          </div>

          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
              🛡️ <strong>Our Promise:</strong> 100% Genuine spare parts, certified local technician, transparent pricing, and 90-day service warranty.
            </p>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Doorstep Repair Service. Serving Vijayawada, Guntur & Nellore.<br/>
          Helpline: +91 9515661677 | Email: bookings@doorstephub.com
        </div>
      </div>
    `;

    // 2. Email template for Doorstep Team (doorstephub@gmail.com)
    const teamHtml = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 8px; color: white;">
          <h2 style="margin: 0; font-size: 20px; color: #38bdf8;">🔔 New Service Booking Received</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Booking #${bookingId} &bull; ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <div style="padding: 20px 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; width: 35%; color: #64748b;">Booking ID:</td><td style="color: #008ba6; font-weight: 800; font-size: 16px;">#${bookingId}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">${fullName}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Phone Number:</td><td><a href="tel:${phone}" style="color: #0284c7; font-weight: bold; font-size: 16px; text-decoration: none;">📞 ${phone}</a></td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Customer Email:</td><td>${email || 'Not provided'}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Service Type:</td><td><span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: 700;">${serviceType}</span></td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">City & Locality:</td><td><strong>${city}</strong> &mdash; ${resolvedLocality}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Address:</td><td>${newBooking.address}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Preferred Time:</td><td>${newBooking.preferredTime}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Notes / Remarks:</td><td>${notes || 'None'}</td></tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="tel:${phone}" style="display: inline-block; background: #008ba6; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none;">Call Customer Now (${phone})</a>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #94a3b8; text-align: center;">
          Automated Doorstep Hub booking notification &bull; Dispatch to local engineer
        </div>
      </div>
    `;

    // Dispatch 1: To Customer (if email is provided)
    if (email && email.includes('@')) {
      try {
        await transporter.sendMail({
          from: `"Doorstep Repair Service" <${smtpUser}>`,
          to: email,
          subject: `Booking Confirmed #${bookingId} - ${serviceType} Repair (${city})`,
          html: customerHtml
        });
        customerEmailSent = true;
      } catch (custErr) {
        console.error('Customer email send error:', custErr.message);
      }
    }

    // Dispatch 2: To Doorstep Team (doorstephub@gmail.com)
    try {
      await transporter.sendMail({
        from: `"Doorstep Bookings Alert" <${smtpUser}>`,
        to: teamAlertEmail,
        subject: `🔔 New Service Booking: #${bookingId} - ${fullName} (${city} - ${serviceType})`,
        html: teamHtml
      });
      teamEmailSent = true;
    } catch (teamErr) {
      console.error('Team email send error (doorstephub@gmail.com):', teamErr.message);
    }

    if (customerEmailSent && teamEmailSent) {
      emailNotice = `Booking confirmed! Confirmation email sent to ${email} and team notified at ${teamAlertEmail}.`;
    } else if (teamEmailSent) {
      emailNotice = `Booking received! Team notified at ${teamAlertEmail}.`;
    } else if (customerEmailSent) {
      emailNotice = `Booking confirmed! Confirmation email sent to ${email}.`;
    } else {
      emailNotice = `Booking registered successfully! Technician will call you at ${phone}.`;
    }

    return res.status(200).json({
      success: true,
      message: 'Booking successfully created!',
      booking: newBooking,
      customerEmailSent,
      teamEmailSent,
      emailNotice
    });
  } catch (error) {
    console.error('Error processing booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing booking',
      error: error.message
    });
  }
});

// Endpoint to list bookings (for admin or testing)
app.get('/api/bookings', (req, res) => {
  res.json({ success: true, count: bookings.length, data: bookings });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Doorstep Repair Service Backend running on port ${PORT}`);
  console.log(`Configured SMTP: ${smtpHost}:${smtpPort} as ${smtpUser}`);
  console.log(`Team Notification Email: ${teamAlertEmail}`);
});
