KK ENGINEERING SECURE SALES FLOW
PayFast checkout + PayFast ITN verification + signed single-use downloads

CUSTOMER-FACING WEBSITE
https://khoaranekatleho-templates.netlify.app/

RECOMMENDED PUBLISHING FLOW
Private GitHub repository -> Netlify deployment -> share only the Netlify/custom-domain website link on LinkedIn.
Do not use GitHub Pages for this project because GitHub Pages cannot run the Netlify Functions used for PayFast checkout, ITN verification, and secure downloads.
Do not make the GitHub repository public while /secure-downloads contains paid files.

WHAT THIS PACKAGE CONTAINS
- Static website files in /public
- Paid files in /secure-downloads, outside the public publish folder
- Netlify Functions in /netlify/functions
- PayFast checkout generation on the server
- PayFast ITN/webhook verification on the server
- Netlify Blobs order storage
- Signed, single-use, 48-hour download tokens

FOLDER STRUCTURE
kk-engineering-templates-store-main/
├── netlify.toml
├── package.json
├── README_SETUP.txt
├── public/
│   ├── index.html
│   ├── payment.html
│   ├── download.html
│   ├── terms.html
│   ├── 404.html
│   └── assets/
│       └── previews/
│           ├── maintenance-planning.jpg
│           ├── preventive-maintenance-checklist.jpg
│           ├── breakdown-report-template.jpg
│           ├── root-cause-analysis-template.jpg
│           ├── pump-inspection-checklist.jpg
│           ├── conveyor-inspection-checklist.jpg
│           ├── gearbox-inspection-checklist.jpg
│           ├── bearing-failure-analysis-sheet.jpg
│           ├── lubrication-schedule-template.jpg
│           └── downtime-tracking-dashboard.jpg
├── secure-downloads/
│   ├── maintenance-planning-excel.xlsx
│   ├── preventive-maintenance-checklist.xlsx
│   ├── breakdown-report-template.xlsx
│   ├── root-cause-analysis-template.docx
│   ├── pump-inspection-checklist.xlsx
│   ├── conveyor-inspection-checklist.xlsx
│   ├── gearbox-inspection-checklist.xlsx
│   ├── bearing-failure-analysis-sheet.xlsx
│   ├── lubrication-schedule-template.xlsx
│   ├── downtime-tracking-dashboard.xlsx
│   └── kk-engineering-complete-bundle.zip
└── netlify/
    └── functions/
        ├── create-checkout.js
        ├── payfast-itn.js
        ├── get-download-link.js
        ├── download-file.js
        ├── products.js
        ├── token.js
        └── payfast-signature.js

NETLIFY BUILD SETTINGS
The included netlify.toml sets:
- Publish directory: public
- Functions directory: netlify/functions
- Included function files: secure-downloads/**

NETLIFY ENVIRONMENT VARIABLES
Set these in Netlify Dashboard → Site configuration → Environment variables:

PAYFAST_MERCHANT_ID       = your PayFast merchant ID
PAYFAST_MERCHANT_KEY      = your PayFast merchant key
PAYFAST_PASSPHRASE        = your PayFast passphrase, if configured in PayFast; otherwise leave blank
PAYFAST_LIVE              = false for sandbox testing, true for live payments
SITE_URL                  = https://khoaranekatleho-templates.netlify.app
LINK_SECRET               = any private random 32+ character string
FROM_EMAIL                = khoaranekatleho@gmail.com, or your verified sending email
SENDGRID_API_KEY          = optional; only needed if you want automatic download emails

For production, SITE_URL must stay fixed to the final public website URL. The checkout function intentionally does not use the browser Origin header for PayFast return, cancel, or ITN callback URLs.

Generate LINK_SECRET with one of these:
- openssl rand -hex 32
- or any password generator using a random 32+ character value

PAYFAST MODE
Sandbox test:
PAYFAST_LIVE=false
Use your PayFast sandbox Merchant ID and Merchant Key.

Live test:
PAYFAST_LIVE=true
Use your PayFast live Merchant ID and Merchant Key.

IMPORTANT TESTING NOTE
Do not test the secure payment/download flow by opening public/index.html directly from your computer. The secure flow needs Netlify Functions.

Deploy to Netlify, or run locally with Netlify CLI:

npm install
netlify dev

PAYMENT AND DOWNLOAD FLOW
1. Buyer opens the deployed site.
2. Buyer clicks Buy on a product.
3. payment.html opens with the selected product.
4. Buyer enters an email address.
5. Buyer clicks Pay with PayFast.
6. /api/create-checkout creates the PayFast payment URL using server-side merchant details.
7. Buyer completes payment in PayFast.
8. PayFast posts ITN data to /api/payfast-itn.
9. payfast-itn verifies the ITN signature, merchant ID, payment amount, payment status, and PayFast server validation.
10. A verified order and signed token are stored in Netlify Blobs.
11. PayFast returns the buyer to download.html?order=... using a randomised order reference.
12. download.html polls /api/get-download-link until the order is verified.
13. Buyer clicks the secure download button.
14. /api/download-file validates the token, checks that it has not already been used, marks it as used, and serves the file.

DIRECT DOWNLOAD PROTECTION
Paid files are not inside the public publish folder. Direct browser access to a paid file should not work, for example:

/secure-downloads/maintenance-planning-excel.xlsx

The file should only download through:

/api/download-file?token=VALID_SIGNED_TOKEN

NOTES
- SendGrid is optional. Without SENDGRID_API_KEY, the download still works on the returned download page.
- Checkout order references include a cryptographically random suffix.
- Download tokens are signed, single-use, and expire after 48 hours.
- For high sales volume, consider moving orders to Supabase, Postgres, or a full ecommerce system later. For this template store, Netlify Blobs is suitable as a lightweight order store.
