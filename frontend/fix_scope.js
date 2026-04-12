const fs = require('fs');
const file = 'c:/Users/hp/Desktop/mali-platform/mali-platform/frontend/src/components/dashboard/SpecialistDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// What went wrong: The closing </div> for the Left Panel is on line ~1054, BUT the {activeTab === 'history'} block was pushed below it.
// The syntax looks mathematically valid as JSX, but because it's rendering below the Left Panel wrapper, the `SpecialistDashboard` return logic gets incorrectly un-nested, closing the scoping context for `pastSessions` state before `activeTab === 'history'` runs.

// Let's grab the entire contents. We want to find:
const targetClosingDiv = `                        </div>
                    )}
                </div>

                {/* HISTORY tab */}`;

const desiredClosingDiv = `                        </div>
                    )}

                    {/* HISTORY tab */}`;

// And then below that, we want to add the `</div>`
const targetCenterPanel = `                        </div>
                    )}
                </div>

                {/* ═══ CENTER PANEL (VIDEO) ═══ */}`;

const desiredCenterPanel = `                        </div>
                    )}
                </div>

                {/* ═══ CENTER PANEL (VIDEO) ═══ */}`;

if (content.includes(targetClosingDiv)) {
    content = content.replace(targetClosingDiv, desiredClosingDiv);
    // Find the end of the history tab
    content = content.replace(
        ")}\n                </div>\n\n                {/* ═══ CENTER PANEL (VIDEO) ═══ */}",
        ")}\n\n                {/* ═══ CENTER PANEL (VIDEO) ═══ */}"
    );

    // I think I better just do an actual Regex logic since spaces could be off.
}

// Alternatively, let's use reliable regex patterns.
content = content.replace(/ \}\)\n *\}\n *<\/div>\n\n *\{\/\* HISTORY tab \*\/\}/g, ' }) // chat messages close\n}\n                 {/* HISTORY tab */}');

// Let's do a much simpler fix. We can just replace using regex.
let newContent = content.replace(/\{\/\* CHAT tab \*\/\}([\s\S]*?)<\/div>\s*\{\/\* HISTORY tab \*\/\}([\s\S]*?)<\/\div>\s*\{\/\* ═══ CENTER PANEL \(VIDEO\) ═══ \*\/\}/,
    `{/* CHAT tab */}$1{/* HISTORY tab */}$2
                </div>
                {/* ═══ CENTER PANEL (VIDEO) ═══ */}`
);

fs.writeFileSync(file, newContent);
console.log('Fixed scope block in SpecialistDashboard.tsx');
