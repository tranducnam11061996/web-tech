import { serialize } from 'php-serialize';

export type AdminImageInput = {
  fileName: string;
  alt?: string;
  ordering?: number;
  isPrimary?: boolean;
};

export function normalizeImages(input: unknown): AdminImageInput[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const record = item as Partial<AdminImageInput>;
      const fileName = String(record.fileName || '').trim();
      if (!fileName) return null;
      return {
        fileName,
        alt: String(record.alt || '').trim(),
        ordering: Number.isFinite(Number(record.ordering)) ? Number(record.ordering) : index,
        isPrimary: Boolean(record.isPrimary),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(Boolean(b!.isPrimary)) - Number(Boolean(a!.isPrimary)) || a!.ordering! - b!.ordering!) as AdminImageInput[];
}

export function serializeProductImages(images: AdminImageInput[]) {
  const rows = images.map((image, index) => ({
    image_name: image.fileName,
    alt: image.alt || '',
    ordering: image.ordering ?? index,
    is_primary: image.isPrimary ? 1 : 0,
  }));

  return {
    serialized: rows.length > 0 ? serialize(rows) : '',
    primary: images[0]?.fileName || '',
    count: images.length,
  };
}

