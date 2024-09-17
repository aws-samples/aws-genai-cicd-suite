#!/bin/bash
# Usage: ./code_layout.sh [REPO_DIR] [OUTPUT_FILE] [EXTRACT_MODE] [FILE_EXTENSIONS]
# Description: Combine all code files in a repository into a single file, with option to extract functions or include whole file content
# Example: ./code_layout.sh ~/projects/my_project combined_output.txt functions py js html css java cpp h cs
# Example: ./code_layout.sh ~/projects/my_project combined_output.txt whole py js html css java cpp h cs

# Directory of the repository (default to current directory if not specified)
REPO_DIR="${1:-.}"

# Output file (default to combined_output.txt if not specified)
OUTPUT_FILE="${2:-combined_output.txt}"

# Extract mode (default to 'functions' if not specified)
EXTRACT_MODE="${3:-functions}"

# List of file extensions to include (default to a predefined list if not specified)
FILE_EXTENSIONS=("${@:4}")
if [ ${#FILE_EXTENSIONS[@]} -eq 0 ]; then
    FILE_EXTENSIONS=("py" "js" "java" "cpp" "ts")
fi

# Empty the output file if it exists
> "$OUTPUT_FILE"

# Function to extract functions and combine files
combine_files() {
    local dir="$1"
    local find_command="find \"$dir\" -type f \\( -name \"*.${FILE_EXTENSIONS[0]}\""
    for ext in "${FILE_EXTENSIONS[@]:1}"; do
        find_command+=" -o -name \"*.$ext\""
    done
    find_command+=" \\) -not -path \"*/node_modules/*\" -print0"

    eval $find_command | while IFS= read -r -d '' file; do
        echo "// File: $file" >> "$OUTPUT_FILE"
        if [ "$EXTRACT_MODE" = "functions" ]; then
            # Extract functions only
            perl -0777 -ne 'print "$&\n\n" while /((?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]*?)?\s*{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*})/gs' "$file" >> "$OUTPUT_FILE"
        else
            # Include whole file content
            cat "$file" >> "$OUTPUT_FILE"
        fi
        echo -e "\n" >> "$OUTPUT_FILE"
    done
}

# Combine the files
combine_files "$REPO_DIR"

echo "All files have been processed and combined into $OUTPUT_FILE"
if [ "$EXTRACT_MODE" = "functions" ]; then
    echo "Mode: Extracted functions only"
else
    echo "Mode: Included whole file content"
fi