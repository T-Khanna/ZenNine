# SPN v1 (Sudoku Portable Notation)

## 1. Design Goals

- Human-readable and easy to diff.
- Lossless round-trip with canonical JSON puzzle model.
- Extensible for variants without breaking old parsers.
- Supports optional move logs for replay/statistics.

## 2. File Structure

An SPN file has sections in this order:
1) Header tags
2) @PUZZLE section (required)
3) @MOVES section (optional)
4) @NOTES section (optional)

Blank lines are allowed between sections.
Lines beginning with # are comments.

## 3. Header Tags

Format:
[Key "Value"]

Recommended tags:
- SPN: format version, example: 1.0
- Title
- Author
- Date (YYYY.MM.DD)
- Size (for example 9x9)
- Symbols (for example 123456789)
- Variant (for example classic, killer, mixed)

Unknown tags must be preserved by compliant tools.

## 4. @PUZZLE Section

Required minimum lines:
- SIZE <rows>x<cols>
- SYMBOLS <symbol-sequence>
- GRID <row1>|<row2>|...|<rowN>

Grid rules:
- Use . for empty cells.
- Each row length must equal cols.
- Number of rows must equal rows.

Region rules:
- Standard boxes: REGION BOX <h>x<w> (for 9x9 standard: REGION BOX 3x3)
- Custom region sets: REGION SET <region-id> <cell-list>

Constraint lines (repeatable):
- CAGE id=<id> sum=<int> cells=<cell-list>
- ARROW id=<id> bulb=<cell-list> path=<cell-list>
- THERMO id=<id> cells=<ordered-cell-list>
- CONSTRAINT type=<name> id=<id> cells=<cell-list> aux=<json-object>

Cell-list format:
- Comma-separated coordinates like r1c1,r1c2,r2c2

## 5. @MOVES Section (Optional)

Each move is one line:
t=<ms> action=<name> <key>=<value> ...

- t=1200 action=set_digit targetCells=r1c1 value=5
- t=1800 action=toggle_candidate targetCells=r1c2 lane=center value=3
- t=1900 action=toggle_candidate targetCells=r1c2 lane=side value=7
- t=2100 action=set_color targetCells=r2c3 value=blue
- t=3100 action=undo
- t=4100 action=toggle_candidate targetCells=r2c1,r2c2,r2c3 lane=center value=4

Parser note:
- Unknown action names should be preserved for forward compatibility.

## 6. @NOTES Section (Optional)

Free-form text notes until end-of-file.

## 7. EBNF (Informal)

spn_file      = header* puzzle_section moves_section? notes_section? ;
header        = "[" key " \"" value "\""]" ;
puzzle_section= "@PUZZLE" newline puzzle_line+ ;
puzzle_line   = size_line | symbols_line | grid_line | region_line | constraint_line | comment ;
moves_section = "@MOVES" newline move_line+ ;
notes_section = "@NOTES" newline text* ;

size_line     = "SIZE " int "x" int ;
symbols_line  = "SYMBOLS " symbol+ ;
grid_line     = "GRID " row ("|" row)* ;
region_line   = "REGION BOX " int "x" int | "REGION SET " id " " cell_list ;
constraint_line = cage | arrow | thermo | generic_constraint ;
move_line     = "t=" int " action=" id (" " kvpair)* ;

## 8. Validation Rules

- Header Size must match SIZE line if both are present.
- Header Symbols must match SYMBOLS line if both are present.
- All cells in givens/regions/constraints must be in bounds.
- Duplicate fixed-value givens for same cell are invalid.
- CAGE sums must be positive integers.
- THERMO order is significant and must contain at least 2 cells.
- ARROW bulb and path must be non-empty and disjoint unless variant says otherwise.
- Candidate actions must specify lane=center|side as a parameter.
- targetCells-scoped edit actions must contain a non-empty targetCells list.

## 9. Canonical JSON Mapping

SPN should map into canonical JSON fields:
- SIZE -> size
- SYMBOLS -> symbols
- GRID givens -> givens[]
- REGION lines -> regions[]
- constraint lines -> constraints[]
- @MOVES -> events[]

## 10. Versioning Strategy

- Major version bump for breaking grammar changes.
- Minor version bump for additive syntax.
- Parsers should ignore unknown keys but preserve them where possible.
