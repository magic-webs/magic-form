/**
 * Single source of truth for the quote form: which products exist, which
 * fields each product asks for, and how every answer is validated.
 *
 * Imported by the browser (live validation) *and* by the Convex mutations
 * (authoritative validation), so a hand-crafted request cannot bypass the rules.
 */

export type FieldType = "radio" | "select" | "text" | "number" | "textarea";

export type FieldSpec = {
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Field is only asked (and only validated) when this condition holds. */
  showIf?: { field: string; equals: string };
};

/** Choosing one of these opens the free-text "please specify" companion input. */
export const OTHER_TRIGGERS = ["Other please complete", "Please describe"];

export function isOtherTrigger(value: string): boolean {
  return OTHER_TRIGGERS.includes(value);
}

/** Companion input name for a field that offers an "other" option. */
export function otherKey(key: string): string {
  return `${key}_other`;
}

export function hasOtherOption(field: FieldSpec): boolean {
  return (field.options ?? []).some(isOtherTrigger);
}

export const MAX_QUANTITY = 1_000_000;

export const FIELDS: Record<string, FieldSpec> = {
  artwork: {
    label: "Artwork",
    type: "radio",
    required: true,
    options: [
      "Supplied print ready and bleeds as a PDF",
      "Printwell to generate the design and artwork",
    ],
  },
  finishBooklet: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A4", "A5", "Other please complete"],
  },
  bookletType: {
    label: "Booklet / Brochure Type",
    type: "radio",
    required: true,
    options: ["Cover heavier and inner lighter", "Self cover"],
  },
  coverWeight: {
    label: "Cover Paper Weight",
    type: "select",
    required: true,
    options: ["250gsm", "300gsm", "350gsm", "Other please complete"],
    showIf: { field: "bookletType", equals: "Cover heavier and inner lighter" },
  },
  innerWeight: {
    label: "Inner Paper Weight",
    type: "select",
    required: true,
    options: ["130gsm", "150gsm", "170gsm", "Other please complete"],
  },
  inkBooklet: {
    label: "Ink",
    type: "select",
    required: true,
    options: ["Black throughout", "Colour throughout", "Other please complete"],
  },
  embellishment: {
    label: "Embellishment on Cover Required",
    type: "select",
    required: false,
    options: ["Not required", "Please describe"],
  },
  finishNewsletter: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A4", "A5", "Other please complete"],
  },
  paperNewsletter: {
    label: "Paper Weight",
    type: "select",
    required: true,
    options: ["130gsm", "150gsm", "170gsm", "Other please complete"],
  },
  inkNewsletter: {
    label: "Ink",
    type: "select",
    required: true,
    options: ["Colour throughout"],
  },
  finishPostcard: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A6", "A5", "Other please complete"],
  },
  paperPostcard: {
    label: "Paper Weight",
    type: "select",
    required: true,
    options: ["250gsm", "300gsm", "350gsm", "Other please complete"],
  },
  inkPostcard: {
    label: "Ink",
    type: "select",
    required: true,
    options: ["Colour face only", "Colour throughout", "Other please complete"],
  },
  finishFlyer: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A4", "A5", "A6", "Other please complete"],
  },
  paperFlyer: {
    label: "Paper Weight",
    type: "select",
    required: true,
    options: [
      "130gsm",
      "150gsm",
      "170gsm",
      "200gsm",
      "250gsm",
      "280gsm",
      "300gsm",
      "350gsm",
      "Other please complete",
    ],
  },
  inkFlyer: {
    label: "Ink",
    type: "select",
    required: true,
    options: [
      "Colour face only",
      "Colour face and reverse",
      "Other please complete",
    ],
  },
  folded: {
    label: "Folded",
    type: "radio",
    required: true,
    options: ["Yes", "No"],
  },
  finishLetterhead: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A4", "Other please complete"],
  },
  paperLetterhead: {
    label: "Paper Weight",
    type: "select",
    required: true,
    options: ["100gsm", "120gsm", "Other please complete"],
  },
  inkLetterhead: {
    label: "Ink",
    type: "select",
    required: true,
    options: ["Colour face only", "Other please complete"],
  },
  finishBusinessCard: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["55 x 85", "Other please complete"],
  },
  paperBusinessCard: {
    label: "Paper Weight",
    type: "select",
    required: true,
    options: ["450gsm", "Other please complete"],
  },
  inkBusinessCard: {
    label: "Ink",
    type: "select",
    required: true,
    options: [
      "Colour face only",
      "Colour face and reverse",
      "Other please complete",
    ],
  },
  finishFolder: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A4", "A5", "Other please complete"],
  },
  paperFolder: {
    label: "Paper Weight",
    type: "select",
    required: true,
    options: ["300gsm", "350gsm", "Other please complete"],
  },
  inkFolder: {
    label: "Ink",
    type: "select",
    required: true,
    options: [
      "Colour face only",
      "Colour face and reverse",
      "Other please complete",
    ],
  },
  dieCutting: {
    label: "Die Cutting",
    type: "radio",
    required: false,
    options: ["Interlocking pockets", "Glued pockets"],
  },
  finishPoster: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["A1", "A2", "A3", "A4", "Other please complete"],
  },
  paperPoster: {
    label: "Paper / Material",
    type: "select",
    required: true,
    options: ["Poster paper", "Other please complete"],
  },
  finishBanner: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: ["2M x 1M", "3M x 1M", "4M x 2M", "Other please complete"],
  },
  paperBanner: {
    label: "Material",
    type: "select",
    required: true,
    options: ["440gsm PVC", "Other please complete"],
  },
  finishRoller: {
    label: "Finish Size",
    type: "select",
    required: true,
    options: [
      "800mm width x 2000mm height (STD)",
      "850mm width x 2000mm height",
      "1000mm width x 2000mm height",
      "Other please complete",
    ],
  },
  labelShape: {
    label: "Finish Shape",
    type: "select",
    required: true,
    options: ["Circle", "Square", "Rectangle", "Other please complete"],
  },
  labelSize: {
    label: "Size",
    type: "text",
    required: true,
    placeholder: "e.g. 50mm x 50mm",
    maxLength: 100,
  },
  labelType: {
    label: "Type",
    type: "radio",
    required: true,
    options: ["Permanent", "Removable"],
  },
  additional: {
    label: "Additional Information to Help Us",
    type: "textarea",
    required: false,
    placeholder: "Please provide any additional information",
    maxLength: 2000,
  },
  quantity: {
    label: "Quantity Required",
    type: "number",
    required: true,
    placeholder: "Enter quantity",
    min: 1,
    max: MAX_QUANTITY,
  },
};

export type ProductSpec = { example: string; fields: string[] };

export const PRODUCTS: Record<string, ProductSpec> = {
  Booklet: {
    example:
      "28pp A4 self cover, printed 4 colour throughout on 170gsm silk and fold stapled and trimmed.",
    fields: [
      "artwork",
      "finishBooklet",
      "bookletType",
      "coverWeight",
      "innerWeight",
      "inkBooklet",
      "embellishment",
      "additional",
      "quantity",
    ],
  },
  Brochures: {
    example:
      "28pp A4 including cover, cover 350gsm and inner pages 130gsm all collated, fold stapled and trimmed.",
    fields: [
      "artwork",
      "finishBooklet",
      "bookletType",
      "coverWeight",
      "innerWeight",
      "inkBooklet",
      "embellishment",
      "additional",
      "quantity",
    ],
  },
  Newsletter: {
    example:
      "12pp self cover printed in colour throughout on white 170gsm silk and folded, trimmed and stapled.",
    fields: [
      "artwork",
      "finishNewsletter",
      "paperNewsletter",
      "inkNewsletter",
      "embellishment",
      "additional",
      "quantity",
    ],
  },
  Postcards: {
    example:
      "A6 printed in 4 colour face only on white 250gsm card and trimmed.",
    fields: [
      "artwork",
      "finishPostcard",
      "paperPostcard",
      "inkPostcard",
      "additional",
      "quantity",
    ],
  },
  "Flyers, Leaflets, Folded Leaflets": {
    example:
      "A4 printed 4 colour front and reverse on white 130gsm silk, trimmed and folded.",
    fields: [
      "artwork",
      "finishFlyer",
      "paperFlyer",
      "inkFlyer",
      "folded",
      "additional",
      "quantity",
    ],
  },
  Letterheads: {
    example: "A4 printed colour on face on white 100gsm bond and trimmed.",
    fields: [
      "artwork",
      "finishLetterhead",
      "paperLetterhead",
      "inkLetterhead",
      "additional",
      "quantity",
    ],
  },
  "Business Cards": {
    example: "55 x 85 printed 4 colours on white 450gsm card and trimmed.",
    fields: [
      "artwork",
      "finishBusinessCard",
      "paperBusinessCard",
      "inkBusinessCard",
      "additional",
      "quantity",
    ],
  },
  "Presentation Folders": {
    example:
      "A4 printed 4 colour on face and reverse on 350gsm card, laminated matt and die cut.",
    fields: [
      "artwork",
      "finishFolder",
      "paperFolder",
      "inkFolder",
      "dieCutting",
      "additional",
      "quantity",
    ],
  },
  Posters: {
    example: "A1 printed on face only on white poster paper and trimmed.",
    fields: [
      "artwork",
      "finishPoster",
      "paperPoster",
      "additional",
      "quantity",
    ],
  },
  Banner: {
    example: "2M x 1M printed 4 colour on face on white 440gsm PVC.",
    fields: ["artwork", "finishBanner", "paperBanner", "additional", "quantity"],
  },
  "Roller Banner": {
    example:
      "800mm wide x 2000mm height printed 4 colour on face on a roller banner.",
    fields: ["artwork", "finishRoller", "additional", "quantity"],
  },
  "Labels/Stickers": {
    example:
      "50mm square labels printed on permanent adhesive, 500 labels per roll.",
    fields: [
      "artwork",
      "labelShape",
      "labelSize",
      "labelType",
      "additional",
      "quantity",
    ],
  },
  "Promotion Items, Garments": {
    example:
      "Please provide details about the promotional item or garment required.",
    fields: ["additional", "quantity"],
  },
};

export const PRODUCT_TYPES = Object.keys(PRODUCTS);

export type Answers = Record<string, string>;
export type Errors = Record<string, string>;

const clean = (value: string | undefined | null) => (value ?? "").trim();

/** A field with a `showIf` is only asked when its condition is satisfied. */
export function isFieldVisible(key: string, answers: Answers): boolean {
  const field = FIELDS[key];
  if (!field?.showIf) return true;
  return clean(answers[field.showIf.field]) === field.showIf.equals;
}

/** Field keys a product asks for right now, given the answers so far. */
export function visibleFieldKeys(
  productType: string,
  answers: Answers,
): string[] {
  const product = PRODUCTS[productType];
  if (!product) return [];
  return product.fields.filter((key) => isFieldVisible(key, answers));
}

/** Validate one field. Returns an error message, or null when it is fine. */
export function validateField(key: string, answers: Answers): string | null {
  const field = FIELDS[key];
  if (!field) return null;
  if (!isFieldVisible(key, answers)) return null;

  const value = clean(answers[key]);

  if (!value) {
    return field.required ? `${field.label} is required.` : null;
  }

  if (field.options && !field.options.includes(value)) {
    return `Choose one of the listed ${field.label.toLowerCase()} options.`;
  }

  if (field.type === "number") {
    if (!/^\d+$/.test(value)) {
      return `${field.label} must be a whole number.`;
    }
    const parsed = Number(value);
    if (field.min !== undefined && parsed < field.min) {
      return `${field.label} must be at least ${field.min}.`;
    }
    if (field.max !== undefined && parsed > field.max) {
      return `${field.label} cannot exceed ${field.max.toLocaleString("en-GB")}.`;
    }
  }

  if (field.maxLength && value.length > field.maxLength) {
    return `${field.label} must be ${field.maxLength} characters or fewer.`;
  }

  if ((field.type === "text" || field.type === "textarea") && value.length < 2) {
    return `${field.label} is too short.`;
  }

  return null;
}

/** Validate the "please specify" companion input for a field. */
export function validateOtherField(
  key: string,
  answers: Answers,
): string | null {
  const field = FIELDS[key];
  if (!field || !hasOtherOption(field)) return null;
  if (!isFieldVisible(key, answers)) return null;
  if (!isOtherTrigger(clean(answers[key]))) return null;

  const detail = clean(answers[otherKey(key)]);
  if (detail.length < 2) {
    return `Please describe the ${field.label.toLowerCase()}.`;
  }
  if (detail.length > 200) return "Please keep this under 200 characters.";
  return null;
}

/** Validate every visible field of a product. Keys are field names. */
export function validateAnswers(productType: string, answers: Answers): Errors {
  const errors: Errors = {};
  if (!PRODUCTS[productType]) {
    errors.productType = "Unknown product type.";
    return errors;
  }
  for (const key of visibleFieldKeys(productType, answers)) {
    const error = validateField(key, answers);
    if (error) errors[key] = error;
    const otherError = validateOtherField(key, answers);
    if (otherError) errors[otherKey(key)] = otherError;
  }
  return errors;
}

export const digitsOf = (value: string) => clean(value).replace(/\D/g, "");

export function validateName(value: string): string | null {
  const name = clean(value);
  if (!name) return "Name is required.";
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (name.length > 80) return "Name must be 80 characters or fewer.";
  if (!/^[\p{L}][\p{L}\p{M}'.\- ]*$/u.test(name)) {
    return "Name can only contain letters, spaces, apostrophes and hyphens.";
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const phone = clean(value);
  if (!phone) return "Phone number is required.";
  if (!/^\+?[\d\s().-]+$/.test(phone)) {
    return "Phone number can only contain digits, spaces and + ( ) - characters.";
  }
  const digits = digitsOf(phone);
  if (digits.length < 7) return "Phone number is too short.";
  if (digits.length > 15) return "Phone number is too long.";
  return null;
}

/** Email is optional everywhere; only the format is enforced when supplied. */
export function validateEmail(value: string): string | null {
  const email = clean(value);
  if (!email) return null;
  if (email.length > 200) return "Email address is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateProductType(value: string): string | null {
  const productType = clean(value);
  if (!productType) return "Product type is required.";
  if (!PRODUCTS[productType]) return "Choose a product type from the list.";
  return null;
}

export function validateQuantity(
  value: string,
  required: boolean,
): string | null {
  const quantity = clean(value);
  if (!quantity) return required ? "Quantity is required." : null;
  if (!/^\d+$/.test(quantity)) return "Quantity must be a whole number.";
  const parsed = Number(quantity);
  if (parsed < 1) return "Quantity must be at least 1.";
  if (parsed > MAX_QUANTITY) {
    return `Quantity cannot exceed ${MAX_QUANTITY.toLocaleString("en-GB")}.`;
  }
  return null;
}

export type LinkInput = {
  customerName: string;
  phone: string;
  email?: string;
  productType: string;
  quantity?: string;
  notes?: string;
};

/** Validates the three things staff type to mint a link (+ optional extras). */
export function validateLinkInput(input: LinkInput): Errors {
  const errors: Errors = {};
  const name = validateName(input.customerName);
  if (name) errors.customerName = name;
  const phone = validatePhone(input.phone);
  if (phone) errors.phone = phone;
  const email = validateEmail(input.email ?? "");
  if (email) errors.email = email;
  const productType = validateProductType(input.productType);
  if (productType) errors.productType = productType;
  const quantity = validateQuantity(input.quantity ?? "", false);
  if (quantity) errors.quantity = quantity;
  if (clean(input.notes).length > 1000) {
    errors.notes = "Notes must be 1000 characters or fewer.";
  }
  return errors;
}

export type ContactInput = {
  customerName: string;
  phone: string;
  email?: string;
};

export function validateContact(input: ContactInput): Errors {
  const errors: Errors = {};
  const name = validateName(input.customerName);
  if (name) errors.customerName = name;
  const phone = validatePhone(input.phone);
  if (phone) errors.phone = phone;
  const email = validateEmail(input.email ?? "");
  if (email) errors.email = email;
  return errors;
}

export type AnswerRow = { key: string; label: string; value: string };

/**
 * Flatten answers into an ordered, human-readable list for storage.
 * An "other"/"please describe" choice is resolved to the text that was typed.
 */
export function buildAnswerRows(
  productType: string,
  answers: Answers,
): AnswerRow[] {
  return visibleFieldKeys(productType, answers)
    .map((key) => {
      const field = FIELDS[key];
      const raw = clean(answers[key]);
      const value = isOtherTrigger(raw) ? clean(answers[otherKey(key)]) : raw;
      return { key, label: field.label, value };
    })
    .filter((row) => row.value !== "");
}

export const hasErrors = (errors: Errors) => Object.keys(errors).length > 0;

/** One screen of the customer wizard. */
export type Step =
  | { id: "contact"; kind: "contact"; label: string }
  | { id: "review"; kind: "review"; label: string }
  | { id: string; kind: "field"; label: string };

/**
 * The wizard asks one thing per screen: contact details, then each visible
 * field in order, then a review. Steps are rebuilt whenever answers change, so
 * a conditional field appears or disappears mid-flow.
 */
export function buildSteps(productType: string, answers: Answers): Step[] {
  return [
    { id: "contact", kind: "contact", label: "Your details" },
    ...visibleFieldKeys(productType, answers).map(
      (key): Step => ({ id: key, kind: "field", label: FIELDS[key].label }),
    ),
    { id: "review", kind: "review", label: "Review" },
  ];
}

/** Errors that must be clear before the wizard will advance past a step. */
export function validateStep(
  step: Step,
  productType: string,
  contact: ContactInput,
  answers: Answers,
): Errors {
  if (step.kind === "contact") return validateContact(contact);
  if (step.kind === "review") {
    return { ...validateContact(contact), ...validateAnswers(productType, answers) };
  }
  const errors: Errors = {};
  const error = validateField(step.id, answers);
  if (error) errors[step.id] = error;
  const otherError = validateOtherField(step.id, answers);
  if (otherError) errors[otherKey(step.id)] = otherError;
  return errors;
}
