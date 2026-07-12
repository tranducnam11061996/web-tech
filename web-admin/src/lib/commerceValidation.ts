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
  province: z.string().trim().max(150).optional().default(''),
  ward: z.string().trim().max(150).optional().default(''),
  address: z.string().trim().max(255).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
}).passthrough().superRefine((value, ctx) => {
  if (value.method === 'shipping' && value.address.length < 3) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Vui lòng nhập địa chỉ giao hàng.' });
});

export const orderSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  voucherCode: z.string().trim().max(64).optional().default(''),
  recaptchaToken: z.string().trim().min(1, 'Không thể xác minh chống bot.').max(4096),
  website: z.string().max(0).optional().default(''),
  customer: customerSchema,
  receiver: z.record(z.unknown()).optional().default({}),
  delivery: deliverySchema,
  paymentMethod: z.enum(['cod', 'bank_transfer']).default('bank_transfer'),
  invoice: z.record(z.unknown()).optional().default({}),
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

export type OrderInput = z.infer<typeof orderSchema>;

export const recaptchaTokenSchema = z.string().trim().min(1, 'Không thể xác minh chống bot.').max(4096);
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
  password: z.string().min(8).max(128),
  recaptchaToken: recaptchaTokenSchema,
}).strict();
export const customerRegistrationSchema = z.object({
  name: text('Họ tên', 2, 150), email: emailSchema, phone: phoneSchema,
  password: z.string().min(8).max(128), confirm: z.string().max(128).optional(), website: z.string().max(200).optional().default(''),
  recaptchaToken: recaptchaTokenSchema,
}).strict();
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
  currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128), confirm: z.string().max(128).optional(),
}).strict();
