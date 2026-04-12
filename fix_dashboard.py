
import os

filepath = r'c:\Users\user\Desktop\Новая папка\frontend\src\components\dashboard\SpecialistDashboard.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We want to find the gap between line 2078 ()} ) and line 2082 ( <div className="mx-3 ... )
# Line numbers in view_file are 1-indexed.
# 2078:                     )}
# 2079: 
# 2080: 
# 2081: 
# 2082:                                     <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2">

start_marker = '                        </div>\n' # 2077
end_marker = '                                {showMentorClassroomTools && Object.keys(handsRaised || {}).length > 0 && (\n'
# Wait, the end marker has been partially deleted or changed.
# Let's look at Turn 31 output again.
# 2081 is empty. 2082 is <div className="mx-3...

target_line_text = '                                    <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2">'

new_block = [
    '                    {showMentorClassroomTools ? (\n',
    '                        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">\n',
    '                            {/* Tabs for extra tools */}\n',
    '                            <div className="flex border-b border-white/5 mx-2 mb-3 mt-2 shrink-0">\n',
    '                                <TabItem active={activeTab === "attendees"} onClick={() => setActiveTab("attendees")} icon={<Users className="w-4 h-4" />} label={t("attendees_label")} />\n',
    '                                <TabItem active={activeTab === "materials"} onClick={() => setActiveTab("materials")} icon={<FileText className="w-4 h-4" />} label={t("materials_label")} />\n',
    '                                <TabItem active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={<History className="w-4 h-4" />} label={t("history_label")} />\n',
    '                            </div>\n',
    '                            {activeTab === "attendees" && (\n',
    '                                <div className="flex flex-col flex-1 pb-4 animate-fade-in">\n'
]

output_lines = []
found = False
for i, line in enumerate(lines):
    # Match the block after 2078
    if not found and '                    )}' in line and i > 2000:
        output_lines.append(line)
        # Skip empty lines until the div
        j = i + 1
        while j < len(lines) and target_line_text not in lines[j]:
            j += 1
        
        output_lines.extend(new_block)
        # The target_line_text was at 2082 in Turn 31.
        # It's part of the block that was inside the conditional.
        # We need to be careful not to double the div.
        found = True
        # Continue from j
        # Wait, if I use lines[j:] later, I should update the loop or just slice.
        # Let's just do a simple replacement if we find a unique string.
        pass

# Actually a simpler search:
full_text = "".join(lines)
search_text = '                    )}\n\n\n\n                                    <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2">'
# This is too brittle.

# Let's use the line index.
# In Turn 31: 
# 2078:                     )}
# 2079-2081: empty
# 2082: ...div...

new_lines = lines[:2078] # Up to and including line 2078 (index 2077)
# Insert new block
new_lines.extend(new_block)
# Skip the empty lines and put the rest
new_lines.extend(lines[2081:])

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed SpecialistDashboard.tsx layout")
