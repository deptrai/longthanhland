# MCP Routing Block (inject vào đầu mỗi subagent task)

## MCP Routing (BẮT BUỘC — tối ưu hiệu quả)
Khi làm việc với code, LUÔN ưu tiên MCP tool theo CLAUDE.md global:

1. **Tìm & hiểu code (không biết file nào)** → `mcp_call_tool` server=`vibervn-context-engine` tool=`codebase-retrieval` arguments={"workspace_full_path":"/Users/luisphan/Documents/GitHub/longthanhland","query":"<câu hỏi>"}. FIRST CHOICE.
2. **Đọc symbol chính xác (đã biết tên hàm/class)** → `mcp_call_tool` server=`serena` tool=`find_symbol` arguments={"name_path_pattern":"<symbol>","include_body":true}. Activate project trước: `mcp_call_tool` server=`serena` tool=`activate_project` arguments={"project":"/Users/luisphan/Documents/GitHub/longthanhland"}.
3. **Tìm references/caller** → `mcp_call_tool` server=`serena` tool=`find_referencing_symbols` arguments={"name_path_pattern":"<symbol>"}.
4. **Refactor symbol** → `mcp_call_tool` server=`serena` tool=`replace_symbol_body` / `insert_after_symbol`.
5. **Review code thay đổi** → `mcp_call_tool` server=`code-review-graph` tool=`build_or_update_graph_tool` → `detect_changes_tool` → `get_impact_radius_tool`.
6. **Phân tích call chain** → `mcp_call_tool` server=`codebase-memory-mcp` tool=`trace_path` arguments={"mode":"calls"}.
7. **Library docs** → `mcp_call_tool` server=`context7` (resolve library ID + get docs — NestJS, Drizzle, Zod, Next.js, sharp, Supabase).
8. **Browser test** → `mcp_call_tool` server=`playwright` tool=`browser_navigate` / `browser_click` / `browser_fill_form` / `browser_snapshot`.

**Quy trình:** `mcp_list_tools` server_name trước → biết tool names + schema → `mcp_call_tool` với arguments đúng.

**Tránh:** KHÔNG dùng grep/glob để tìm code definition khi serena/context-engine làm được. Dùng Read trước khi Edit file (bắt buộc). Dùng grep chỉ cho text/config/log files.
