import { z } from 'zod';

const controlCharacters = /[\u0000-\u001f\u007f]/;
const vietnamMobile = /^(?:0|\+84)(?:3[2-9]|5[25689]|7[06-9]|8[1-689]|9[0-9])\d{7}$/;

export function normalizeVietnamPhone(value: string) {
  const compact = value.replace(/[\s().-]/g, '');
  const normalized = compact.startsWith('84') ? `+${compact}` : compact;
  return normalized.startsWith('+84') ? `0${normalized.slice(3)}` : normalized;
}

const text = (label: string, min: number, max: number) => z.string().trim().min(min, `${label} quá ngắn.`).max(max, `${label} quá dài.`)
  .refine((value) => !controlCharacters.test(value), `${label} chứa ký tự không hợp lệ.`);

export const emailSchema = z.string().trim().toLowerCase().email('Email không hợp lệ.').max(255, 'Email quá dài.');
export const phoneSchema = z.string().transform(normalizeVietnamPhone)
  .refine((value) => vietnamMobile.test(value), 'Số điện thoại Việt Nam không hợp lệ.');
const optionalPhoneSchema = z.union([phoneSchema, z.literal('')]);
const optionalEmailSchema = z.union([emailSchema, z.literal('')]);
const strongPasswordSchema = z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.').max(128, 'Mật khẩu quá dài.')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa.')
  .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường.')
  .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số.')
  .regex(/[^A-Za-z0-9\s]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt.');

const cartItemSchema = z.object({
  productId: z.coerce.number().int().positive('Sản phẩm không hợp lệ.'),
  quantity: z.coerce.number().int().min(1).max(99),
}).strict();

export const cartQuoteSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Giỏ hàng đang trống.').max(50, 'Giỏ hàng có quá nhiều sản phẩm.'),
  voucherCode: z.string().trim().max(64).optional().default(''),
}).strict();

const customerSchema = z.object({
  name: text('Họ tên', 2, 150),
  phone: phoneSchema,
  email: z.union([emailSchema, z.literal('')]).optional().default(''),
}).passthrough();

const deliverySchema = z.object({
  method: z.enum(['shipping', 'pickup']).default('shipping'),
  provinceCode: z.string().trim().max(20).optional().default(''),
  province: z.string().trim().max(150).optional().default(''),
  wardCode: z.string().trim().max(20).optional().default(''),
  ward: z.string().trim().max(150).optional().default(''),
  address: z.string().trim().max(255).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
}).passthrough().superRefine((value, ctx) => {
  if (value.method !== 'shipping') return;
  if (!value.provinceCode) ctx.addIssue({ code: 'custom', path: ['provinceCode'], message: 'Vui lòng chọn tỉnh/thành phố.' });
  if (!value.wardCode) ctx.addIssue({ code: 'custom', path: ['wardCode'], message: 'Vui lòng chọn phường/xã/đặc khu.' });
  if (value.address.length < 3) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Vui lòng nhập địa chỉ giao hàng.' });
});

const receiverSchema = z.object({
  enabled: z.boolean().optional().default(false),
  name: z.string().trim().max(150).optional().default(''),
  phone: optionalPhoneSchema.optional().default(''),
}).strict().superRefine((value, ctx) => {
  if (!value.enabled) return;
  if (value.name.length < 2) ctx.addIssue({ code: 'custom', path: ['name'], message: 'Vui lòng nhập họ tên người nhận.' });
  if (!value.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Vui lòng nhập số điện thoại người nhận.' });
});

const invoiceSchema = z.object({
  enabled: z.boolean().optional().default(false),
  companyName: z.string().trim().max(255).optional().default(''),
  taxCode: z.string().trim().max(20).optional().default(''),
  address: z.string().trim().max(255).optional().default(''),
  email: optionalEmailSchema.optional().default(''),
}).strict().superRefine((value, ctx) => {
  if (!value.enabled) return;
  if (value.companyName.length < 2) ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Vui lòng nhập tên công ty.' });
  if (!/^\d{10}(?:-\d{3})?$/.test(value.taxCode.replace(/\s/g, ''))) ctx.addIssue({ code: 'custom', path: ['taxCode'], message: 'Mã số thuế phải gồm 10 chữ số hoặc có dạng 0123456789-001.' });
  if (value.address.length < 3) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Vui lòng nhập địa chỉ xuất hóa đơn.' });
  if (!value.email) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Vui lòng nhập email nhận hóa đơn.' });
});

export const orderSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  voucherCode: z.string().trim().max(64).optional().default(''),
  // The verifier remains authoritative and rejects empty tokens outside the explicit local bypass.
  recaptchaToken: z.string().trim().max(4096),
  website: z.string().max(0).optional().default(''),
  customer: customerSchema,
  receiver: receiverSchema.optional().default({}),
  delivery: deliverySchema,
  paymentMethod: z.enum(['cod', 'bank_transfer']).default('bank_transfer'),
  invoice: invoiceSchema.optional().default({}),
  note: z.string().trim().max(1000).optional().default(''),
}).strict();

export const comboOrderSchema = orderSchema.omit({ items: true, voucherCode: true }).extend({
  // The verifier enforces a real token outside the explicit non-production bypass.
  // Allow an empty browser token here so local bypass can be reached when no site key is configured.
  recaptchaToken: z.string().trim().max(4096),
  anchorProductId: z.coerce.number().int().positive(),
  comboSetId: z.coerce.number().int().positive(),
  revision: z.string().trim().min(8).max(64),
  items: z.array(z.object({
    groupIndex: z.coerce.number().int().min(0).max(19),
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(99),
  }).strict()).min(1).max(50),
}).strict();

export type ComboOrderInput = z.infer<typeof comboOrderSchema>;

export const pcBuilderOrderSchema = orderSchema.omit({ items: true, voucherCode: true }).extend({
  selections: z.array(z.object({
    componentCode: z.string().trim().min(1).max(32).regex(/^[a-z0-9_]+$/),
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(4),
  }).strict()).min(1).max(24),
  assemblyRequired: z.boolean().optional().default(true),
  warningsConfirmed: z.boolean().optional().default(false),
  warningFingerprint: z.string().regex(/^[a-f0-9]{64}$/i).optional().default(''),
  warningSignature: z.string().regex(/^[a-f0-9]{64}$/i).optional().default(''),
}).strict();

export type OrderInput = z.infer<typeof orderSchema>;

export const recaptchaTokenSchema = z.string().trim().max(4096);
export const customerLoginSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(false),
  recaptchaToken: recaptchaTokenSchema,
}).strict();
export const passwordResetRequestSchema = z.object({ email: emailSchema, recaptchaToken: recaptchaTokenSchema }).strict();
export const passwordResetConfirmSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'Mã xác thực phải gồm 6 chữ số.'),
  password: strongPasswordSchema,
  recaptchaToken: recaptchaTokenSchema,
}).strict();
export const customerRegistrationSchema = z.object({
  name: text('Họ tên', 2, 150), email: emailSchema, phone: phoneSchema,
  password: strongPasswordSchema, confirm: z.string().min(1, 'Vui lòng nhập lại mật khẩu.').max(128), website: z.string().max(200).optional().default(''),
  recaptchaToken: recaptchaTokenSchema,
}).strict().superRefine((value, ctx) => {
  if (value.password !== value.confirm) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Mật khẩu nhập lại chưa khớp.' });
});
export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Mã xác thực phải gồm 6 chữ số.'), recaptchaToken: recaptchaTokenSchema }).strict();
export const customerProfileSchema = z.object({
  name: text('Họ tên', 2, 150), gender: z.enum(['', 'male', 'female', 'other']).default(''),
  birthday: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional()
    .refine((value) => { if (!value) return true; const date=new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value && date.getTime()<=Date.now(); }, 'Ngày sinh không hợp lệ.'),
}).strict();
export const customerAddressSchema = z.object({
  recipientName: text('Người nhận', 2, 150), phone: phoneSchema,
  type: z.enum(['home', 'office', 'other']).default('home'), address: text('Địa chỉ', 3, 255),
  provinceCode: z.string().trim().min(1).max(20), wardCode: z.string().trim().min(1).max(20),
  isDefault: z.boolean().optional().default(false),
}).strict();
export const customerPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.').max(128), newPassword: strongPasswordSchema, confirm: z.string().min(1, 'Vui lòng nhập lại mật khẩu.').max(128),
}).strict().superRefine((value, ctx) => {
  if (value.currentPassword === value.newPassword) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
  if (value.newPassword !== value.confirm) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Mật khẩu nhập lại chưa khớp.' });
});
