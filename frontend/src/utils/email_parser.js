/**
 * Utility to replace {{tag}} with real data values
 */
export const parseEmailTemplate = (template, data) => {
  if (!template) return "";

  // Regular expression to find all occurrences of {{variable_name}}
  return template.replace(/{{(.*?)}}/g, (match, key) => {
    const cleanKey = key.trim();
    // If the key exists in our data object, swap it; otherwise, keep the tag
    return data[cleanKey] !== undefined ? data[cleanKey] : match;
  });
};