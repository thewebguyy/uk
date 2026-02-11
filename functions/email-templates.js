/**
 * EMAIL TEMPLATES for Cloud Functions
 */

const getOrderConfirmationHTML = (order, orderId) => {
    const itemsHTML = order.items.map(item => `
        <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between;">
                <strong>${item.name}</strong>
                <span>x${item.quantity}</span>
            </div>
            <div style="color: #666; font-size: 0.9em;">£${item.price.toFixed(2)} each</div>
        </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #000; }
            .header h1 { margin: 0; letter-spacing: 2px; }
            .content { padding: 20px 0; }
            .order-meta { background: #f9f9f9; padding: 15px; margin: 20px 0; }
            .totals { margin-top: 20px; border-top: 2px solid #eee; padding-top: 10px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .grand-total { font-size: 1.2em; font-weight: bold; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
            .footer { text-align: center; font-size: 0.8em; color: #666; margin-top: 40px; }
            .btn { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CUSTOMISE ME UK</h1>
            </div>
            <div class="content">
                <h2>Thank you for your order!</h2>
                <p>Hi ${order.shippingAddress.name || 'there'},</p>
                <p>We've received your payment and our team is now preparing your custom items. You'll receive another notification once your order has been shipped.</p>
                
                <div class="order-meta">
                    <strong>Order Number:</strong> ${orderId}<br>
                    <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}
                </div>

                <h3>Items</h3>
                ${itemsHTML}

                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>£${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>VAT (20%):</span>
                        <span>£${order.tax.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>£${order.shipping.toFixed(2)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>TOTAL:</span>
                        <span>£${order.total.toFixed(2)}</span>
                    </div>
                </div>

                <div style="margin-top: 30px;">
                    <h3>Shipping To:</h3>
                    <p>
                        ${order.shippingAddress.name}<br>
                        ${order.shippingAddress.address}<br>
                        ${order.shippingAddress.city}, ${order.shippingAddress.postcode}<br>
                        United Kingdom
                    </p>
                </div>

                <div style="text-align: center;">
                    <a href="https://customisemeuk.com/order-tracking.html?order=${orderId}" class="btn">TRACK YOUR ORDER</a>
                </div>
            </div>
            <div class="footer">
                <p>Customise Me UK | Premium Designs & Bespoke Merch</p>
                <p>info@customisemeuk.com | 07588770901</p>
                <p>© 2026 Customise Me UK. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const getContactEmailHTML = (data) => {
    return `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
        <h2>New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Service:</strong> ${data.service}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${data.message}</p>
    </div>
    `;
};

module.exports = { getOrderConfirmationHTML, getContactEmailHTML };
