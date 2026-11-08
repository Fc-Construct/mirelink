#!/usr/bin/env python3
"""
update_phonebook.py
Automation script for Fc-Construct's MIRE Squiglink.

Treats data/phone_book.json as the curated source of truth:
1. Reads existing data/phone_book.json first, preserving all manual curation, ordering, and names.
   - Raises a RuntimeError if the file exists but is malformed or invalid to prevent overwriting.
2. Scans /data/ directory for headphone measurement files (supporting compact L1/R1 and spaced L 1/R 1).
3. Compares parsed measurement file prefixes with existing phonebook file mappings.
4. Leaves all existing entries completely intact (never removes or overwrites existing models).
5. For newly discovered measurement prefixes:
   - Matches to an existing model if it represents a new variant (e.g. glasses or pad variant).
   - Otherwise, adds a new model or brand cleanly.
6. Writes the merged result to data/phone_book.json and mirrors to public/data/phone_book.json.
"""

import os
import re
import json
import shutil
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "phone_book.json")
PUBLIC_OUTPUT_FILE = os.path.join(PUBLIC_DATA_DIR, "phone_book.json")

# Known multi-word headphone brands for clean categorization of new discoveries
MULTIWORD_BRANDS = [
    "Audio Technica",
    "Dan Clark Audio",
    "Austrian Audio",
    "Meze Audio",
    "ZMF Headphones",
    "ArcTec Berlin",
    "HEDD Audio"
]

def parse_filename(filename):
    """
    Stems channel and seating number from the end of the filename.
    Supports both compact (e.g. ' L1', ' R2') and spaced (e.g. ' L 1', ' R 2', ' L', ' R').
    """
    if not filename.endswith(".txt"):
        return None

    stem = filename[:-4].strip()

    # Match channel and optional seating number at the end
    match = re.search(r"^(.*?)\s+([LR])\s*(\d*)$", stem, re.IGNORECASE)
    if not match:
        return None

    full_name = match.group(1).strip()
    channel = match.group(2).upper()
    seating = match.group(3)

    return {
        "full_file_prefix": full_name,
        "channel": channel,
        "seating": int(seating) if seating else 1
    }

def extract_brand_and_model(full_file_prefix, known_brands=None):
    """
    Extracts brand and model string.
    1. Checks if file starts with any brand already present in phone_book.json.
    2. Checks known multi-word brands list.
    3. Fallback: Splits on the first space.
    """
    candidate_brands = list(MULTIWORD_BRANDS)
    if known_brands:
        for b in known_brands:
            if b not in candidate_brands:
                candidate_brands.append(b)

    sorted_brands = sorted(candidate_brands, key=len, reverse=True)
    for brand in sorted_brands:
        if full_file_prefix.lower().startswith(brand.lower() + " ") or full_file_prefix.lower() == brand.lower():
            rest = full_file_prefix[len(brand):].strip()
            return brand, rest if rest else brand

    parts = full_file_prefix.split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return full_file_prefix, full_file_prefix

def sync_data_to_public():
    if not os.path.exists(DATA_DIR):
        return

    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

    for root, dirs, files in os.walk(DATA_DIR):
        rel_path = os.path.relpath(root, DATA_DIR)
        dest_dir = os.path.join(PUBLIC_DATA_DIR, rel_path) if rel_path != "." else PUBLIC_DATA_DIR
        os.makedirs(dest_dir, exist_ok=True)
        for f in files:
            src_file = os.path.join(root, f)
            dest_file = os.path.join(dest_dir, f)
            if not os.path.exists(dest_file) or os.path.getmtime(src_file) > os.path.getmtime(dest_file):
                shutil.copy2(src_file, dest_file)

    for root, dirs, files in os.walk(PUBLIC_DATA_DIR):
        rel_path = os.path.relpath(root, PUBLIC_DATA_DIR)
        src_dir = os.path.join(DATA_DIR, rel_path) if rel_path != "." else DATA_DIR
        for f in files:
            src_file = os.path.join(src_dir, f)
            if not os.path.exists(src_file):
                try:
                    os.remove(os.path.join(root, f))
                except OSError:
                    pass

def load_existing_phonebook():
    """
    Loads existing data/phone_book.json if available.
    Fails hard (raises RuntimeError) if the file exists but is malformed or invalid
    to prevent overwriting the curated source of truth with an empty list.
    """
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                raise RuntimeError(f"Error: {OUTPUT_FILE} root structure must be a JSON list.")
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise e
            raise RuntimeError(f"Error: Failed to parse existing {OUTPUT_FILE} as valid JSON: {e}")
    return []

def get_known_prefixes(phonebook):
    """
    Returns a set of all file prefixes already listed in the phonebook.
    """
    known = set()
    for brand_entry in phonebook:
        for phone in brand_entry.get("phones", []):
            f = phone.get("file")
            if isinstance(f, list):
                known.update(f)
            elif isinstance(f, str):
                known.add(f)
    return known

def find_matching_model_for_variant(new_prefix, phonebook):
    """
    Determines if a new prefix belongs to an existing model as a variant.
    Returns (brand_entry, phone_entry, variant_suffix) if matched, else None.
    Avoids greedy prefix collisions (e.g. Susvara vs Susvara Unveiled).
    Only matches explicit glasses tokens (e.g. '<ex> G' / '<ex> Glasses') or explicit parentheses.
    """
    for brand_entry in phonebook:
        for phone in brand_entry.get("phones", []):
            files = phone.get("file")
            existing_prefixes = files if isinstance(files, list) else [files]
            
            # Check if new_prefix is a glasses variant of an existing file prefix
            for ex in existing_prefixes:
                # Matches e.g. "<ex> G" or "<ex> Glasses"
                g_match = re.search(r"^(.*?)\s+\b(G|Glasses)\b$", new_prefix, re.IGNORECASE)
                if g_match and g_match.group(1).strip() == ex:
                    # Find corresponding base suffix if available
                    suffixes = phone.get("suffix")
                    ex_suffix = ""
                    if isinstance(suffixes, list) and len(suffixes) == len(existing_prefixes):
                        ex_suffix = suffixes[existing_prefixes.index(ex)]
                    new_suffix = f"{ex_suffix} Glasses".strip() if ex_suffix else "Glasses"
                    return brand_entry, phone, new_suffix

                # Matches e.g. "<ex> (<variant_name>)"
                paren_match = re.search(r"^(.*?)\s*\(([^)]+)\)$", new_prefix)
                if paren_match and paren_match.group(1).strip() == ex:
                    var_label = paren_match.group(2).strip()
                    cleaned_var = re.sub(r"\bG\b", "Glasses", var_label, flags=re.IGNORECASE)
                    return brand_entry, phone, cleaned_var

    return None

def update_phonebook():
    if not os.path.exists(DATA_DIR):
        print(f"Error: Directory '{DATA_DIR}' does not exist.")
        return

    # 1. Load existing curated phonebook (raises RuntimeError if invalid JSON)
    phonebook = load_existing_phonebook()

    # 2. Extract existing file prefixes to ensure zero duplicates
    known_prefixes = get_known_prefixes(phonebook)

    # 3. Scan for measurement files in /data/
    discovered_prefixes = set()
    for fname in os.listdir(DATA_DIR):
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.isfile(fpath):
            parsed = parse_filename(fname)
            if parsed:
                discovered_prefixes.add(parsed["full_file_prefix"])

    # 4. Filter for new prefixes not yet represented in phone_book.json
    new_prefixes = sorted(discovered_prefixes - known_prefixes)

    if not new_prefixes:
        print("Phonebook is up to date. No new measurements to add.")
        sync_data_to_public()
        # Save to ensure mirrored public copy matches
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(phonebook, f, indent=2)
        with open(PUBLIC_OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(phonebook, f, indent=2)
        return

    print(f"Discovered {len(new_prefixes)} new measurement prefix(es) to merge:")
    for np in new_prefixes:
        print(f"  + {np}")

    known_brand_names = [b["name"] for b in phonebook]

    # 5. Process each new prefix without altering any existing entries
    unmatched_new_models = []
    for prefix in new_prefixes:
        match = find_matching_model_for_variant(prefix, phonebook)
        if match:
            brand_entry, phone_entry, variant_suffix = match
            # Upgrade phone_entry to multi-file/suffix if it was a single string
            current_files = phone_entry.get("file")
            current_suffixes = phone_entry.get("suffix")

            if isinstance(current_files, str):
                current_files = [current_files]
                current_suffixes = [""]

            if not isinstance(current_suffixes, list) or len(current_suffixes) != len(current_files):
                current_suffixes = ["" for _ in current_files]

            current_files.append(prefix)
            current_suffixes.append(variant_suffix)

            phone_entry["file"] = current_files
            phone_entry["suffix"] = current_suffixes
            print(f"  -> Added variant '{variant_suffix}' to existing model '{phone_entry.get('name')}' under brand '{brand_entry.get('name')}'")
        else:
            unmatched_new_models.append(prefix)

    # 6. For newly discovered models that don't match existing models as variants
    if unmatched_new_models:
        brand_grouped = defaultdict(list)
        for p in unmatched_new_models:
            brand, rest = extract_brand_and_model(p, known_brand_names)
            brand_grouped[brand].append((p, rest))

        for brand, items in brand_grouped.items():
            # Find or create brand entry in phonebook
            brand_entry = next((b for b in phonebook if b["name"].lower() == brand.lower()), None)
            if not brand_entry:
                brand_entry = {"name": brand, "phones": []}
                phonebook.append(brand_entry)

            # Check if items represent base + glasses variants
            model_subgroups = defaultdict(list)
            for full_p, rest in items:
                clean_name = re.sub(r"\s+\b(G|Glasses)\b$", "", rest, flags=re.IGNORECASE).strip()
                if not clean_name:
                    clean_name = rest
                model_subgroups[clean_name].append(full_p)

            for model_name, prefixes in model_subgroups.items():
                if len(prefixes) > 1:
                    sorted_p = sorted(prefixes, key=lambda x: (1 if re.search(r"\b(G|Glasses)\b$", x, re.I) else 0, x))
                    suffixes = ["Glasses" if re.search(r"\b(G|Glasses)\b$", x, re.I) else "" for x in sorted_p]
                    brand_entry["phones"].append({
                        "name": model_name,
                        "file": sorted_p,
                        "suffix": suffixes
                    })
                else:
                    is_glasses = bool(re.search(r"\b(G|Glasses)\b$", prefixes[0], re.I))
                    brand_entry["phones"].append({
                        "name": model_name,
                        "file": prefixes[0] if not is_glasses else prefixes,
                        **({"suffix": ["Glasses"]} if is_glasses else {})
                    })
                print(f"  -> Added new model '{model_name}' under brand '{brand_entry['name']}'")

    # 7. Write curated, merged result to data/phone_book.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(phonebook, f, indent=2)

    # 8. Mirror to /public/data/ and write public/data/phone_book.json
    sync_data_to_public()

    with open(PUBLIC_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(phonebook, f, indent=2)

    print(f"Successfully merged updates into {OUTPUT_FILE} and mirrored to {PUBLIC_OUTPUT_FILE}")

if __name__ == "__main__":
    update_phonebook()
