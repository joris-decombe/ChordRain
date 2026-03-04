/**
 * Validation utilities for user inputs
 */

export interface FileLike {
    name: string;
    size: number;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIDI_EXTENSIONS = ['.mid', '.midi'];
const ALLOWED_GP_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx'];
const ALLOWED_EXTENSIONS = [...ALLOWED_MIDI_EXTENSIONS, ...ALLOWED_GP_EXTENSIONS];

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateSongFile(file: FileLike): ValidationResult {
    if (!file) {
        return { valid: false, error: "No file provided." };
    }

    // 1. Check File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`
        };
    }

    // 2. Check Extension (Case-insensitive)
    const lowerName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            valid: false,
            error: `Invalid file type. Please upload a MIDI (${ALLOWED_MIDI_EXTENSIONS.join(', ')}) or Guitar Pro (${ALLOWED_GP_EXTENSIONS.join(', ')}) file.`
        };
    }

    return { valid: true };
}

export function isMidiFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return ALLOWED_MIDI_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function isGuitarProFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return ALLOWED_GP_EXTENSIONS.some(ext => lower.endsWith(ext));
}
