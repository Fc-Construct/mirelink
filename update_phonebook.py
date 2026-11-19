#!/usr/bin/env python3
"""
update_phonebook.py
Automation script for Fc-Construct's MIRE Squiglink.

Treats data/phone_book.json as the curated source of truth:
1. Reads existing data/phone_book.json first, preserving all manual curation, ordering, and names.
2. Scans /data/ directory for headphone measurement files (supporting compact L1/R1 and spaced L 1/R 1).
3. Computes content-based fingerprints per prefix (ignoring comment headers) so renamed files
   (e.g. fixing a brand/model typo) are matched in-place without losing curated ordering or metadata.
4. Prunes any stale variants, models, or empty brands whose measurement files no longer exist in /data/.
5. For newly discovered measurement prefixes:
   - Matches to an existing model if it represents a new variant (e.g. glasses or pad variant).
   - Otherwise, adds a new model or brand cleanly.
6. Writes updates to data/phone_book.json, data/file_inventory.json, .phonebook_hashes.json,
   and mirrors data to public/data/.
"""

import os
import re
import json
import shutil
import hashlib
from difflib import SequenceMatcher
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "phone_book.json")
PUBLIC_OUTPUT_FILE = os.path.join(PUBLIC_DATA_DIR, "phone_book.json")
INVENTORY_FILE = os.path.join(DATA_DIR, "file_inventory.json")
HASH_FILE = os.path.join(BASE_DIR, ".phonebook_hashes.json")

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


def compute_file_data_hash(filepath):
    """
    Computes SHA-256 of numeric measurement lines (skipping '*' REW header lines)
    so header metadata edits alongside a rename do not change the fingerprint.
    Falls back to full file bytes if no numeric lines exist.
    """
    h = hashlib.sha256()
    has_data = False
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                stripped = line.strip()
                if not stripped or stripped.startswith("*"):
                    continue
                h.update(stripped.encode("utf-8"))
                h.update(b"\n")
                has_data = True
        if has_data:
            return h.hexdigest()
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def compute_prefix_hash(file_entries):
    """
    Computes a combined deterministic SHA-256 signature for all channel/seating files
    belonging to a single measurement prefix.
    """
    parts = []
    for channel, seating, fpath in sorted(file_entries, key=lambda x: (x[0], x[1], os.path.basename(x[2]))):
        fhash = compute_file_data_hash(fpath)
        if fhash:
            parts.append(f"{channel}:{seating}:{fhash}")
    if not parts:
        return None
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def load_previous_hashes():
    if not os.path.exists(HASH_FILE):
        return {}
    try:
        with open(HASH_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def write_json_if_changed(filepath, data):
    serialized = json.dumps(data, indent=2)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                if f.read() == serialized:
                    return False
        except OSError:
            pass
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(serialized)
    return True


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
                known.update(x for x in f if isinstance(x, str))
            elif isinstance(f, str):
                known.add(f)
    return known


def find_rename_matches(missing_prefixes, new_prefixes, prev_hashes, curr_hashes):
    """
    Matches missing prefixes to newly discovered prefixes when files were renamed.
    Pass 1: Exact unique content-hash match via .phonebook_hashes.json.
    Pass 2: Strict typo-similarity fallback (same word count, tiny length delta, mutual best >= 0.80)
            for renames occurring before hashes were recorded.
    """
    rename_map = {}
    remaining_missing = set(missing_prefixes)
    remaining_new = set(new_prefixes)

    # Pass 1: Unique content hash matches
    prev_hash_to_old = defaultdict(list)
    for old_p in remaining_missing:
        h = prev_hashes.get(old_p)
        if h:
            prev_hash_to_old[h].append(old_p)

    curr_hash_to_new = defaultdict(list)
    for new_p in remaining_new:
        h = curr_hashes.get(new_p)
        if h:
            curr_hash_to_new[h].append(new_p)

    for h, olds in prev_hash_to_old.items():
        news = curr_hash_to_new.get(h, [])
        if len(olds) == 1 and len(news) == 1:
            rename_map[olds[0]] = news[0]
            remaining_missing.discard(olds[0])
            remaining_new.discard(news[0])

    # Pass 2: Typo-similarity fallback for remaining unmatched entries
    if remaining_missing and remaining_new:
        candidates = []
        for old_p in sorted(remaining_missing):
            old_words = old_p.split()
            for new_p in sorted(remaining_new):
                new_words = new_p.split()
                if len(old_words) != len(new_words):
                    continue
                if abs(len(old_p) - len(new_p)) > 3:
                    continue
                ratio = SequenceMatcher(None, old_p.lower(), new_p.lower()).ratio()
                if ratio >= 0.80:
                    candidates.append((ratio, old_p, new_p))

        candidates.sort(reverse=True)
        for ratio, old_p, new_p in candidates:
            if old_p in remaining_missing and new_p in remaining_new:
                rename_map[old_p] = new_p
                remaining_missing.discard(old_p)
                remaining_new.discard(new_p)

    return rename_map


def apply_renames(phonebook, rename_map):
    """
    Applies detected prefix renames in place while preserving manual curation.
    Only updates brand/model display names when they previously matched the old
    auto-derived brand/model name (custom curated display names are left intact).
    """
    if not rename_map:
        return

    known_brands = [b.get("name", "") for b in phonebook if b.get("name")]
    # Also include target brand names from new prefixes so multi-word brands match cleanly
    brand_candidates = list(known_brands)
    for new_p in rename_map.values():
        b, _ = extract_brand_and_model(new_p, known_brands)
        if b not in brand_candidates:
            brand_candidates.append(b)

    phones_to_relocate = []  # (src_brand_entry, phone_entry, target_brand_name)

    for brand_entry in phonebook:
        old_brand_name = brand_entry.get("name", "")
        brand_targets = []

        for phone_entry in brand_entry.get("phones", []):
            files = phone_entry.get("file")
            is_list = isinstance(files, list)
            file_list = list(files) if is_list else ([files] if isinstance(files, str) else [])

            changed_here = False
            for idx, old_p in enumerate(file_list):
                if old_p not in rename_map:
                    continue
                new_p = rename_map[old_p]
                file_list[idx] = new_p
                changed_here = True

                old_b, old_rest = extract_brand_and_model(old_p, known_brands)
                new_b, new_rest = extract_brand_and_model(new_p, brand_candidates)
                brand_targets.append((old_b, new_b))

                # Update model display name only if it wasn't custom-curated
                clean_old_model = re.sub(r"\s+\b(G|Glasses)\b$", "", old_rest, flags=re.IGNORECASE).strip() or old_rest
                clean_new_model = re.sub(r"\s+\b(G|Glasses)\b$", "", new_rest, flags=re.IGNORECASE).strip() or new_rest
                cur_model_name = phone_entry.get("name", "")
                if cur_model_name == clean_old_model or cur_model_name == old_rest:
                    phone_entry["name"] = clean_new_model

                print(f"  ~ Renamed file prefix '{old_p}' -> '{new_p}' under '{old_brand_name}'")

            if changed_here:
                phone_entry["file"] = file_list if is_list else file_list[0]

        # If every phone in this brand entry renamed to the same new brand name
        if brand_targets:
            unique_new_brands = {nb for _, nb in brand_targets}
            if len(unique_new_brands) == 1:
                target_brand = next(iter(unique_new_brands))
                if target_brand.lower() != old_brand_name.lower():
                    # Only migrate brand name if it previously mirrored the old prefix's brand
                    if all(ob.lower() == old_brand_name.lower() for ob, _ in brand_targets):
                        existing_dest = next(
                            (b for b in phonebook if b is not brand_entry and b.get("name", "").lower() == target_brand.lower()),
                            None
                        )
                        if existing_dest is not None:
                            for pe in list(brand_entry.get("phones", [])):
                                phones_to_relocate.append((brand_entry, pe, target_brand))
                        else:
                            print(f"  ~ Renamed brand '{old_brand_name}' -> '{target_brand}' in place")
                            brand_entry["name"] = target_brand

    # Relocate phones if merged into an already-existing brand
    for src_brand, pe, target_brand in phones_to_relocate:
        dest_brand = next((b for b in phonebook if b.get("name", "").lower() == target_brand.lower()), None)
        if dest_brand is not None and pe in src_brand.get("phones", []):
            src_brand["phones"].remove(pe)
            dest_brand.setdefault("phones", []).append(pe)

    # Remove any brand emptied by relocation
    phonebook[:] = [b for b in phonebook if b.get("phones")]


def prune_missing_entries(phonebook, missing_prefixes):
    """
    Removes any variants, models, or brands whose measurement files no longer exist in /data/.
    """
    if not missing_prefixes:
        return

    for brand_entry in list(phonebook):
        brand_name = brand_entry.get("name", "")
        kept_phones = []

        for phone_entry in brand_entry.get("phones", []):
            files = phone_entry.get("file")
            suffixes = phone_entry.get("suffix")

            if isinstance(files, str):
                if files in missing_prefixes:
                    print(f"  - Pruned missing model '{brand_name} {phone_entry.get('name', files)}' ({files})")
                    continue
                kept_phones.append(phone_entry)
            elif isinstance(files, list):
                has_suffixes = isinstance(suffixes, list) and len(suffixes) == len(files)
                kept_files = []
                kept_suffixes = []

                for i, fn in enumerate(files):
                    if fn in missing_prefixes:
                        print(f"  - Pruned missing variant '{fn}' from '{brand_name} {phone_entry.get('name', '')}'")
                        continue
                    kept_files.append(fn)
                    if has_suffixes:
                        kept_suffixes.append(suffixes[i])

                if not kept_files:
                    print(f"  - Pruned empty model '{brand_name} {phone_entry.get('name', '')}'")
                    continue

                if len(kept_files) == 1 and (not has_suffixes or kept_suffixes[0] == ""):
                    phone_entry["file"] = kept_files[0]
                    phone_entry.pop("suffix", None)
                else:
                    phone_entry["file"] = kept_files
                    if has_suffixes:
                        phone_entry["suffix"] = kept_suffixes

                kept_phones.append(phone_entry)
            else:
                kept_phones.append(phone_entry)

        brand_entry["phones"] = kept_phones

    phonebook[:] = [b for b in phonebook if b.get("phones")]


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
                if not isinstance(ex, str):
                    continue
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

    # 1. Load existing curated phonebook
    phonebook = load_existing_phonebook()
    known_prefixes = get_known_prefixes(phonebook)

    # 2. Scan for measurement files in /data/ and collect file entries per prefix
    discovered_files = defaultdict(list)
    for fname in os.listdir(DATA_DIR):
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.isfile(fpath):
            parsed = parse_filename(fname)
            if parsed:
                discovered_files[parsed["full_file_prefix"]].append(
                    (parsed["channel"], parsed["seating"], fpath)
                )

    discovered_prefixes = set(discovered_files.keys())

    # Safety guard: never wipe curated phone_book.json if /data/ appears empty
    if not discovered_prefixes and known_prefixes:
        print("Warning: No measurement .txt files discovered in /data/. Aborting phonebook modification.")
        return

    # 3. Compute content fingerprints for all discovered prefixes
    prev_hashes = load_previous_hashes()
    curr_hashes = {}
    for prefix, entries in discovered_files.items():
        h = compute_prefix_hash(entries)
        if h:
            curr_hashes[prefix] = h

    # 4. Identify missing and new prefixes
    missing_prefixes = known_prefixes - discovered_prefixes
    new_prefixes = discovered_prefixes - known_prefixes

    # 5. Match renamed files in place BEFORE pruning missing entries
    rename_map = {}
    if missing_prefixes and new_prefixes:
        rename_map = find_rename_matches(missing_prefixes, new_prefixes, prev_hashes, curr_hashes)
        if rename_map:
            print(f"Detected {len(rename_map)} renamed prefix(es):")
            apply_renames(phonebook, rename_map)
            missing_prefixes -= set(rename_map.keys())
            new_prefixes -= set(rename_map.values())

    # 6. Prune any remaining dead prefixes
    if missing_prefixes:
        print(f"Pruning {len(missing_prefixes)} missing prefix(es):")
        prune_missing_entries(phonebook, missing_prefixes)

    # 7. Process genuinely new prefixes
    sorted_new = sorted(new_prefixes)
    if sorted_new:
        print(f"Discovered {len(sorted_new)} new measurement prefix(es) to merge:")
        for np in sorted_new:
            print(f"  + {np}")

        known_brand_names = [b["name"] for b in phonebook]
        unmatched_new_models = []

        for prefix in sorted_new:
            match = find_matching_model_for_variant(prefix, phonebook)
            if match:
                brand_entry, phone_entry, variant_suffix = match
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

        if unmatched_new_models:
            brand_grouped = defaultdict(list)
            for p in unmatched_new_models:
                brand, rest = extract_brand_and_model(p, known_brand_names)
                brand_grouped[brand].append((p, rest))

            for brand, items in brand_grouped.items():
                brand_entry = next((b for b in phonebook if b["name"].lower() == brand.lower()), None)
                if not brand_entry:
                    brand_entry = {"name": brand, "phones": []}
                    phonebook.append(brand_entry)

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

    # 8. Persist updated phonebook, hashes, inventory, and mirror to /public/data/
    pb_changed = write_json_if_changed(OUTPUT_FILE, phonebook)
    write_json_if_changed(HASH_FILE, dict(sorted(curr_hashes.items())))
    generate_file_inventory()
    sync_data_to_public()
    write_json_if_changed(PUBLIC_OUTPUT_FILE, phonebook)

    if pb_changed or rename_map or missing_prefixes or sorted_new:
        print(f"Successfully updated {OUTPUT_FILE}")
    else:
        print("Phonebook is up to date.")


def generate_file_inventory():
    if not os.path.exists(DATA_DIR):
        return {}

    inventory = defaultdict(list)
    for root, dirs, files in os.walk(DATA_DIR):
        for f in sorted(files):
            if f.endswith(".txt"):
                stem = f[:-4].strip()
                match = re.search(r"^(.*?)\s+([LR])\s*(\d*)$", stem, re.IGNORECASE)
                if match:
                    prefix = match.group(1).strip()
                else:
                    prefix = stem
                rel_path = os.path.relpath(os.path.join(root, f), DATA_DIR).replace("\\", "/")
                inventory[prefix].append(rel_path)

    sorted_inventory = {}
    for prefix in sorted(inventory.keys()):
        sorted_inventory[prefix] = sorted(inventory[prefix])

    if write_json_if_changed(INVENTORY_FILE, sorted_inventory):
        print(f"Generated file inventory with {len(sorted_inventory)} prefixes in {INVENTORY_FILE}")
    return sorted_inventory


if __name__ == "__main__":
    update_phonebook()
