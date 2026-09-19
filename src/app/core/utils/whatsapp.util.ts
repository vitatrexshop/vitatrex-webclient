/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Agent 1 — Core Utilities & Link Generator (Angular / TypeScript mirror)
 *  WhatsApp (wa.me) Deep-Link Helper — VitaTrex Store
 *  Store WhatsApp Number: 201043674944
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const STORE_WA_NUMBER = '201128782527';

export interface WhatsAppOrderItem {
  name?: string;
  quantity?: number;
  product?: any;
}

export interface WhatsAppOrderPayload {
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  items?: (WhatsAppOrderItem | any)[] | string;
  totalAmount?: number | string;
  paymentMethod?: string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    governorate?: string;
    paymentMethod?: string;
  };
}

/**
 * Normalizes payment method keys into friendly Arabic labels.
 */
export function formatPaymentMethod(method?: string): string {
  if (!method) return 'الدفع عند الاستلام';
  const m = String(method).trim().toLowerCase();
  if (m === 'cod') return 'الدفع عند الاستلام (COD)';
  if (m === 'card') return 'بطاقة بنكية (Visa / MasterCard)';
  return String(method);
}

/**
 * Generates a pre-filled WhatsApp wa.me link with full order breakdown.
 *
 * Accepts either a single payload object or positional arguments:
 *   generateWhatsAppLink({ orderId, customerName, phone, address, items, totalAmount, paymentMethod })
 *   generateWhatsAppLink(orderId, customerName, phone, address, items, totalAmount, paymentMethod)
 */
export function generateWhatsAppLink(
  orderOrId: WhatsAppOrderPayload | string,
  customerName?: string | number,
  phone?: string,
  address?: string,
  items?: (WhatsAppOrderItem | any)[] | string,
  totalAmount?: number | string,
  paymentMethod?: string
): string {
  let safeOrderId = '';
  let safeCustomerName = '';
  let safePhone = '';
  let safeAddress = '';
  let safeItems: any = [];
  let safeTotal: number | string = 0;
  let safePayment = '';

  if (typeof orderOrId === 'object' && orderOrId !== null) {
    // Object payload provided
    safeOrderId = orderOrId.orderId || orderOrId.orderNumber || '';
    safeCustomerName =
      orderOrId.customerName ||
      (orderOrId.customer && orderOrId.customer.name) ||
      '';
    safePhone =
      orderOrId.phone ||
      (orderOrId.customer && orderOrId.customer.phone) ||
      '';
    safeAddress =
      orderOrId.address ||
      (orderOrId.customer &&
        [
          orderOrId.customer.address,
          orderOrId.customer.governorate || orderOrId.customer.city,
        ]
          .filter(Boolean)
          .join(' - ')) ||
      '';
    safeItems = orderOrId.items || [];
    safeTotal = orderOrId.totalAmount !== undefined ? orderOrId.totalAmount : 0;
    safePayment =
      orderOrId.paymentMethod ||
      (orderOrId.customer && orderOrId.customer.paymentMethod) ||
      '';
  } else if (
    typeof orderOrId === 'string' &&
    typeof customerName === 'number'
  ) {
    // Legacy backwards compatibility: generateWhatsAppLink(orderId, totalAmount, customerName)
    safeOrderId = orderOrId;
    safeTotal = customerName;
    safeCustomerName = phone || '';
  } else {
    // Positional arguments: (orderId, customerName, phone, address, items, totalAmount, paymentMethod)
    safeOrderId = String(orderOrId || '');
    safeCustomerName = String(customerName || '');
    safePhone = String(phone || '');
    safeAddress = String(address || '');
    safeItems = items || [];
    safeTotal = totalAmount !== undefined ? totalAmount : 0;
    safePayment = String(paymentMethod || '');
  }

  // Format line items list
  let itemsList = '';
  if (Array.isArray(safeItems)) {
    if (safeItems.length === 0) {
      itemsList = '• لم يتم تحديد منتجات';
    } else {
      itemsList = safeItems
        .map((item) => {
          if (!item) return '• منتج × 1';
          const name =
            item.name ||
            (item.product &&
              (typeof item.product === 'object'
                ? item.product.name
                : item.product)) ||
            'منتج';
          const qty = item.quantity || 1;
          return `• ${name} × ${qty}`;
        })
        .join('\n');
    }
  } else if (typeof safeItems === 'string') {
    itemsList = safeItems.trim();
  } else {
    itemsList = '• لم يتم تحديد منتجات';
  }

  // Format total amount with thousands separators
  const formattedTotal =
    typeof safeTotal === 'number'
      ? safeTotal.toLocaleString('en-US')
      : String(safeTotal || '0');

  const safePaymentMethod = formatPaymentMethod(safePayment);

  // Exact WhatsApp Markdown layout
  const message =
`🌿 *VitaTrex | تأكيد طلب جديد*
────────────────
🆔 *رقم الطلب:* #${String(safeOrderId).trim()}
👤 *العميل:* ${String(safeCustomerName).trim() || 'عميل VitaTrex'}
📱 *الموبايل:* ${String(safePhone).trim() || '-'}
📍 *العنوان:* ${String(safeAddress).trim() || '-'}

📦 *تفاصيل الشحنة:*
${itemsList}

💰 *الإجمالي النهائي:* ${formattedTotal} ج.م
💳 *طريقة الدفع:* ${safePaymentMethod}
────────────────
_برجاء مراجعة الطلب وتأكيده للبدء في التجهيز._`;

  return `https://wa.me/${STORE_WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Sanitizes a raw Egyptian phone number and ensures the 20 country-code prefix.
 * Used by the Admin Panel for direct customer outreach links.
 */
export function sanitizePhoneForWhatsApp(rawPhone: string): string {
  if (!rawPhone) return '';

  let digits = String(rawPhone).replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('20')) {
    return digits;
  } else if (digits.startsWith('0')) {
    return '2' + digits;
  } else if (digits.startsWith('1')) {
    return '20' + digits;
  }

  return '20' + digits;
}

/**
 * Generates a direct admin-to-customer WhatsApp chat link.
 */
export function generateAdminWhatsAppLink(rawPhone: string): string {
  const normalized = sanitizePhoneForWhatsApp(rawPhone);
  if (!normalized) return '#';
  return `https://wa.me/${normalized}`;
}
