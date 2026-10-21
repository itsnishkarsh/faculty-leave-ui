export function readableLeaveReason(reason: string) {
  const legacy = reason.match(/^DEMO DATA:\s*seed-v2\s+\S+\s+(pending|approved|rejected) request\.\s*(.*)$/i);
  if (legacy) {
    if (legacy[1].toLowerCase() === "pending") return "I need to attend to a family commitment. Please review the coverage plan for these dates.";
    if (legacy[1].toLowerCase() === "approved") return "I will be attending an academic workshop during these dates.";
    return "I requested leave for a personal commitment, but coverage could not be arranged on these dates.";
  }
  return reason.replace(/^DEMO DATA:\s*/i, "");
}

export function readableMessageBody(body: string) {
  return body.replace(/^DEMO DATA:\s*/i, "");
}
