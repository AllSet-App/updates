export const getPrintStyles = (pageSize = 'A4') => `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      font-size: 14px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
    }
    
    @media print {
      body { margin: 0; }
      @page { size: ${pageSize}; margin: 15mm; }
      .no-print { display: none; }
      .container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #FF2E36;
      padding-bottom: 20px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo-light.png {
      width: 90px;
      height: 90px;
    }

    .company-info h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #FF2E36;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .company-info .tagline {
      margin: 2px 0 0;
      font-size: 14px;
      color: #666;
      font-weight: 500;
      letter-spacing: 1px;
    }

    .contact-info {
      text-align: right;
      font-size: 13px;
      color: #555;
    }

    .contact-info p {
      margin: 2px 0;
    }

    .contact-info strong {
      color: #333;
    }

    /* Invoice Info Grid */
    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 40px;
    }

    .info-column {
      flex: 1;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .details-table td {
      padding: 3px 0;
      vertical-align: top;
    }

    .label-col {
      width: 100px;
      color: #666;
      font-weight: 500;
    }

    .sep-col {
      width: 15px;
      color: #999;
      text-align: center;
    }

    .value-col {
      font-weight: 600;
      color: #333;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table th {
      background-color: #f9f9f9;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .items-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      color: #333;
    }

    .items-table tr:last-child td {
      border-bottom: 1px solid #FF2E36;
    }

    .item-desc {
      font-weight: 500;
    }
    
    .item-notes {
      font-size: 12px;
      color: #777;
      margin-top: 4px;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Totals Section */
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-box {
      width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 14px;
    }

    .total-row.final {
      border-top: 2px solid #eee;
      margin-top: 10px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 700;
      color: #FF2E36;
    }

    .total-label { color: #666; }
    .total-value { font-weight: 600; }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #888;
      font-size: 12px;
    }
    
    .footer p { margin: 4px 0; }
`
