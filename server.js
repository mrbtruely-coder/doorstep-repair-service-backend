const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Universal CORS configuration (handles preflight OPTIONS requests)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Path to brand logo for inline CID embedding
const logoPath = path.join(__dirname, 'assets', 'logo.png');
const hasLogo = fs.existsSync(logoPath);

// In-memory service bookings store (or connect to DB)
const bookings = [];

// Configure SMTP credentials (cPanel or custom SMTP host)
const smtpHost = process.env.BOOKINGS_EMAIL_HOST || process.env.SMTP_HOST || 'homeappliancerepairsservices.com';
const smtpPort = parseInt(process.env.BOOKINGS_EMAIL_PORT || process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.BOOKINGS_EMAIL_USER || process.env.EMAIL_USER || 'bookinginfo@homeappliancerepairsservices.com';
const smtpPass = (process.env.BOOKINGS_EMAIL_PASS || process.env.EMAIL_PASS || '').trim();
const teamAlertEmail = process.env.DOORSTEP_TEAM_EMAIL || smtpUser;

// Official App Store Links
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.doorstephub.customer&pcampaignid=web_share';
const APP_STORE_URL = 'https://apps.apple.com/in/app/doorstep-hub-all-your-needs/id6475340236';

// Helper to create transporter
const getTransporter = () => {
  const isGmail = smtpUser.toLowerCase().endsWith('@gmail.com') || smtpHost.toLowerCase().includes('gmail');
  
  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, '') // remove spaces from Google App Password
      }
    });
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000
  });
};

// Dispatch helper with automated logo attachment
const dispatchEmail = async (mailOptions) => {
  const transporter = getTransporter();
  
  // Attach logo if exists and not already attached
  const attachments = [...(mailOptions.attachments || [])];
  if (hasLogo && !attachments.some(a => a.cid === 'homeApplianceLogo')) {
    attachments.push({
      filename: 'home-appliance-logo.png',
      path: logoPath,
      cid: 'homeApplianceLogo'
    });
  }

  const finalMailOptions = {
    ...mailOptions,
    attachments
  };

  const info = await transporter.sendMail(finalMailOptions);
  return { success: true, info };
};

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Home Appliance & Doorstep Repair Service API',
    endpoints: {
      health: '/api/health',
      testEmail: '/api/test-email',
      bookService: '/api/book-service (POST)'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Home Appliance Repair Service API is active',
    smtpHost,
    smtpPort,
    smtpUser: smtpUser ? `${smtpUser.slice(0, 4)}***@${smtpUser.split('@')[1] || ''}` : 'Not set',
    teamEmail: teamAlertEmail,
    hasLogo,
    logoPath: hasLogo ? logoPath : 'Not found'
  });
});

// Diagnostic endpoint to test email delivery
app.get('/api/test-email', async (req, res) => {
  const targetEmail = req.query.to || smtpUser;

  try {
    const result = await dispatchEmail({
      from: `"Home Appliance Repair Services" <${smtpUser}>`,
      to: targetEmail,
      subject: '✅ Home Appliance Service SMTP & Logo Test Email',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
          <div style="background: #ffffff; padding: 20px; text-align: center; border-bottom: 2px solid #f1f5f9;">
            <img src="cid:homeApplianceLogo" alt="Home Appliance Repair Services" style="max-height: 52px; width: auto; max-width: 260px; object-fit: contain; display: inline-block;" />
          </div>
          <div style="background: linear-gradient(135deg, #008ba6 0%, #005a6f 100%); padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; color: #ffffff;">SMTP Connection & Logo Test</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #e0f2fe;">Doorstep & Home Appliance Repair Services</p>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p style="font-size: 15px; margin-top: 0;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.6;">
              This is a test email confirming that your email configuration for <strong>${smtpUser}</strong> on host <strong>${smtpHost}:${smtpPort}</strong> is functioning properly and your official company logo is rendering in the email header.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
              <div><strong>Host:</strong> ${smtpHost}</div>
              <div><strong>Port:</strong> ${smtpPort} (SSL)</div>
              <div><strong>Sender Account:</strong> ${smtpUser}</div>
              <div><strong>Status:</strong> Active & Connected</div>
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc;">
            &copy; ${new Date().getFullYear()} Home Appliance Repair Services &bull; Support: <a href="mailto:${smtpUser}" style="color: #008ba6; text-decoration: none;">${smtpUser}</a>
          </div>
        </div>
      `,
      text: `Home Appliance Repair Service SMTP & Logo Test Email sent successfully via ${smtpHost}:${smtpPort} as ${smtpUser}.`
    });

    res.json({
      success: true,
      message: `Test email dispatched to ${targetEmail}`,
      details: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email test failed',
      error: error.message,
      code: error.code,
      response: error.response,
      smtpHost,
      smtpPort,
      smtpUser
    });
  }
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
    let customerError = null;
    let teamError = null;
    let emailNotice = '';

    // 1. Email template for Customer with embedded Logo Header & Industry Standard App Store Footer
    const customerHtml = `
      <div style="font-family: 'Segoe UI', Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; margin: auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; color: #1e293b; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Official Logo Header -->
        <div style="background: #ffffff; padding: 20px 24px; text-align: center; border-bottom: 2px solid #f1f5f9;">
          <img src="cid:homeApplianceLogo" alt="Home Appliance Repair Services" style="max-height: 54px; width: auto; max-width: 260px; object-fit: contain; display: inline-block;" />
        </div>

        <!-- Banner Header -->
        <div style="background: linear-gradient(135deg, #008ba6 0%, #005a6f 100%); padding: 22px 24px; color: white; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.01em; color: #ffffff;">Home Appliance Repair Services</h1>
          <p style="margin: 6px 0 0; font-size: 13.5px; opacity: 0.95; color: #e0f2fe;">Fast & Reliable Doorstep Technician in ${city}</p>
        </div>

        <div style="padding: 24px 20px;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Your Booking is Confirmed! 🎉</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Hello <strong>${fullName}</strong>,<br/>
            Thank you for choosing <strong>Home Appliance Repair Services</strong>! We have registered your service request. Our certified technician will arrive at your doorstep in your preferred slot.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #008ba6; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              Booking Summary
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 40%; color: #64748b;">Booking ID:</td><td style="color: #008ba6; font-weight: 800; font-size: 15px;">#${bookingId}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">${fullName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Customer Mobile:</td><td style="font-weight: 800; color: #0284c7; font-size: 15px;">${phone}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Customer Email:</td><td style="font-weight: 600; color: #0f172a;">${email}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Appliance & Service:</td><td style="font-weight: 700; color: #0369a1;">${serviceType}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">City & Locality:</td><td><strong>${city}</strong> (${resolvedLocality})</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Service Address:</td><td>${newBooking.address}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Arrival Window:</td><td>${newBooking.preferredTime}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Customer Notes:</td><td>${notes || 'None'}</td></tr>
            </table>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
              <strong>Need quick assistance or need to reschedule?</strong><br/>
              Call or WhatsApp Support: <a href="tel:9515661677" style="color: #008ba6; font-weight: bold; text-decoration: none;">+91 9515661677</a> &bull; Email: <a href="mailto:${smtpUser}" style="color: #008ba6; text-decoration: none; font-weight: 600;">${smtpUser}</a>
            </p>
          </div>

          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
              🛡️ <strong>Service Promise:</strong> Verified technicians, genuine spare parts, transparent pricing, and 90-day doorstep warranty.
            </p>
          </div>
        </div>

        <!-- Industry Standard Responsive App Download Section -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 14px; text-align: center;">
          <p style="margin: 0 0 6px; font-size: 14.5px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
            Experience Faster Bookings on Doorstep Hub App
          </p>
          <p style="margin: 0 0 14px; font-size: 12.5px; color: #64748b; line-height: 1.4; max-width: 440px; margin-left: auto; margin-right: auto;">
            Track your technician in real-time, get instant discounts, and manage appliance warranty.
          </p>
          
          <div style="text-align: center; margin: 0 auto;">
            <div style="display: inline-block; vertical-align: middle; margin: 5px 6px;">
              <a href="${PLAY_STORE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" height="42" style="display: block; height: 42px; width: auto; max-width: 140px; border: 0;" />
              </a>
            </div>
            <div style="display: inline-block; vertical-align: middle; margin: 5px 6px;">
              <a href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" height="42" style="display: block; height: 42px; width: auto; max-width: 140px; border: 0;" />
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding: 18px 20px; text-align: center; color: #64748b; font-size: 12px; background: #ffffff;">
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; background: #e0f2fe; color: #0284c7; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; border: 1px solid #bae6fd;">
              🛡️ Verified &amp; Trusted by Doorstep Hub
            </span>
          </div>
          &copy; ${new Date().getFullYear()} Home Appliance Repair Services. Serving Vijayawada, Guntur &amp; Nellore.<br/>
          Helpline: <a href="tel:9515661677" style="color: #008ba6; text-decoration: none; font-weight: bold;">+91 9515661677</a> | Email: <a href="mailto:${smtpUser}" style="color: #008ba6; text-decoration: none;">${smtpUser}</a>
        </div>
      </div>
    `;

    // 2. Email template for Internal Team with Logo Header & App Store links
    const teamHtml = `
      <div style="font-family: 'Segoe UI', Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; margin: auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; color: #0f172a; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Official Logo Header -->
        <div style="background: #ffffff; padding: 18px 24px; text-align: center; border-bottom: 2px solid #f1f5f9;">
          <img src="cid:homeApplianceLogo" alt="Home Appliance Repair Services" style="max-height: 48px; width: auto; max-width: 240px; object-fit: contain; display: inline-block;" />
        </div>

        <!-- Banner Alert -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 18px 24px; color: white;">
          <h2 style="margin: 0; font-size: 19px; color: #38bdf8;">🚨 New Customer Booking Alert</h2>
          <p style="margin: 4px 0 0; font-size: 12.5px; color: #94a3b8;">Booking #${bookingId} &bull; ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <div style="padding: 20px 18px;">
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">CUSTOMER CONTACT:</div>
            <div style="font-size: 20px; font-weight: 800; color: #0284c7;">
              <a href="tel:${phone}" style="color: #0284c7; text-decoration: none;">📞 ${phone}</a>
            </div>
            <div style="font-size: 14px; color: #334155; margin-top: 4px;">
              <strong>Email:</strong> <a href="mailto:${email}" style="color: #008ba6; text-decoration: underline;">${email || 'Not provided'}</a>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; width: 35%; color: #64748b;">Booking ID:</td><td style="color: #008ba6; font-weight: 800; font-size: 16px;">#${bookingId}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Customer Name:</td><td style="font-weight: 700; color: #0f172a; font-size: 15px;">${fullName}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Customer Mobile:</td><td><a href="tel:${phone}" style="color: #0284c7; font-weight: 800; font-size: 16px; text-decoration: none;">📞 ${phone}</a></td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Customer Email:</td><td><strong>${email || 'Not provided'}</strong></td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Service Needed:</td><td><span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: 700;">${serviceType}</span></td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">City & Locality:</td><td><strong>${city}</strong> &mdash; ${resolvedLocality}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Address:</td><td>${newBooking.address}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Preferred Slot:</td><td>${newBooking.preferredTime}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold; color: #64748b;">Customer Notes:</td><td>${notes || 'None'}</td></tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="tel:${phone}" style="display: inline-block; background: #008ba6; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 15px;">Call Customer Now (${phone})</a>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding: 14px; font-size: 12px; color: #94a3b8; text-align: center; background: #f8fafc;">
          Home Appliance Repair Services Real-Time Dispatch Alert &bull; Customer Mobile: ${phone}
        </div>
      </div>
    `;

    // Dispatch 1: To Customer (if email is provided)
    if (email && email.includes('@')) {
      try {
        await dispatchEmail({
          from: `"Home Appliance Repair Services" <${smtpUser}>`,
          to: email,
          subject: `Booking Confirmed #${bookingId} - ${serviceType} Repair (${city})`,
          html: customerHtml
        });
        customerEmailSent = true;
      } catch (custErr) {
        console.error('Customer email send error:', custErr.message);
        customerError = custErr.message;
      }
    }

    // Dispatch 2: To Team Alert Email
    try {
      await dispatchEmail({
        from: `"Home Appliance Bookings Alert" <${smtpUser}>`,
        to: teamAlertEmail,
        subject: `🚨 NEW BOOKING #${bookingId}: ${fullName} | 📞 ${phone} | ${city} (${serviceType})`,
        html: teamHtml
      });
      teamEmailSent = true;
    } catch (teamErr) {
      console.error(`Team email send error (${teamAlertEmail}):`, teamErr.message);
      teamError = teamErr.message;
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
      customerError,
      teamError,
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

if (typeof PhusionPassenger !== 'undefined') {
  app.listen('passenger', () => {
    console.log('Home Appliance Repair Service Backend running inside Phusion Passenger');
  });
} else {
  app.listen(PORT, () => {
    console.log(`Home Appliance Repair Service Backend running on port ${PORT}`);
    console.log(`Configured SMTP Host: ${smtpHost}:${smtpPort}`);
    console.log(`Configured SMTP User: ${smtpUser}`);
    console.log(`Team Notification Email: ${teamAlertEmail}`);
    console.log(`Logo Embedded Status: ${hasLogo ? 'Found at ' + logoPath : 'Not found'}`);
  });
}

module.exports = app;
