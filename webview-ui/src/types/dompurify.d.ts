// Override DOMPurify types to avoid compatibility issues
declare module 'dompurify' {
  interface DOMPurifyI {
    sanitize(
      dirty: string | Node,
      options?: {
        RETURN_DOM?: boolean;
        RETURN_DOM_FRAGMENT?: boolean;
        RETURN_DOM_IMPORT?: boolean;
        RETURN_TRUSTED_TYPE?: boolean;
        IN_PLACE?: boolean;
        USE_PROFILES?: {
          html?: boolean;
          svg?: boolean;
          svgFilters?: boolean;
          mathMl?: boolean;
        };
        ALLOWED_TAGS?: string[];
        ALLOWED_ATTR?: string[];
        ALLOWED_NAMESPACES?: string[];
        FORBID_TAGS?: string[];
        FORBID_ATTR?: string[];
        ALLOW_DATA_ATTR?: boolean;
        ALLOW_UNKNOWN_PROTOCOLS?: boolean;
        ALLOW_SELF_CLOSE_IN_ATTR?: boolean;
        SAFE_FOR_TEMPLATES?: boolean;
        SAFE_FOR_JQUERY?: boolean;
        WHOLE_DOCUMENT?: boolean;
        SANITIZE_DOM?: boolean;
        FORCE_BODY?: boolean;
        ALLOWED_URI_REGEXP?: RegExp;
        ADD_TAGS?: string[];
        ADD_ATTR?: string[];
        ADD_URI_SAFE_ATTR?: string[];
        FORBID_CONTENTS?: string[];
        FORBID_TAGS?: string[];
        FORBID_ATTR?: string[];
        USE_PROFILES?: object;
        KEEP_CONTENT?: boolean;
      }
    ): string;
    isSupported: boolean;
  }

  const DOMPurify: DOMPurifyI;
  export = DOMPurify;
} 