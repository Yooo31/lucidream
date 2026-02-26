declare module 'expo-file-system/legacy' {
  export const documentDirectory: string | null;

  export const EncodingType: {
    Base64: string;
    UTF8: string;
  };

  export function makeDirectoryAsync(
    uri: string,
    options?: {
      intermediates?: boolean;
    },
  ): Promise<void>;

  export function writeAsStringAsync(
    uri: string,
    content: string,
    options?: {
      encoding?: string;
    },
  ): Promise<void>;

  export function copyAsync(options: { from: string; to: string }): Promise<void>;

  export function readAsStringAsync(
    uri: string,
    options?: {
      encoding?: string;
    },
  ): Promise<string>;

  export function getInfoAsync(uri: string): Promise<{
    exists: boolean;
  }>;

  export function deleteAsync(
    uri: string,
    options?: {
      idempotent?: boolean;
    },
  ): Promise<void>;
}
