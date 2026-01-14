// Organization hierarchy for NYC Civic Meeting Calendar
// Each key is a URL-safe identifier, used in calendar URLs

const organizations = {
  "city-council": {
    name: "City Council",
    children: {
      "stated": { name: "Stated Meetings" },
      // Standing Committees
      "aging": { name: "Committee on Aging" },
      "children-youth": { name: "Committee on Children and Youth" },
      "civil-human-rights": { name: "Committee on Civil and Human Rights" },
      "civil-service-labor": { name: "Committee on Civil Service and Labor" },
      "consumer-worker-protection": { name: "Committee on Consumer and Worker Protection" },
      "contracts": { name: "Committee on Contracts" },
      "criminal-justice": { name: "Committee on Criminal Justice" },
      "cultural-affairs": { name: "Committee on Cultural Affairs, Libraries, and International Intergroup Organizations" },
      "economic-development": { name: "Committee on Economic Development" },
      "education": { name: "Committee on Education" },
      "environmental-protection": { name: "Committee on Environmental Protection, Resiliency & Waterfronts" },
      "finance": { name: "Committee on Finance" },
      "fire-emergency": { name: "Committee on Fire and Emergency Management" },
      "general-welfare": { name: "Committee on General Welfare" },
      "governmental-operations": { name: "Committee on Governmental Operations, State & Federal Legislation" },
      "health": { name: "Committee on Health" },
      "higher-education": { name: "Committee on Higher Education" },
      "hospitals": { name: "Committee on Hospitals" },
      "housing-buildings": { name: "Committee on Housing and Buildings" },
      "immigration": { name: "Committee on Immigration" },
      "land-use": { name: "Committee on Land Use" },
      "mental-health": { name: "Committee on Mental Health, Disabilities, and Addiction" },
      "oversight-investigations": { name: "Committee on Oversight and Investigations" },
      "parks-recreation": { name: "Committee on Parks and Recreation" },
      "public-housing": { name: "Committee on Public Housing" },
      "public-safety": { name: "Committee on Public Safety" },
      "rules-privileges": { name: "Committee on Rules, Privileges, and Elections" },
      "sanitation": { name: "Committee on Sanitation and Solid Waste Management" },
      "small-business": { name: "Committee on Small Business" },
      "standards-ethics": { name: "Committee on Standards and Ethics" },
      "technology": { name: "Committee on Technology" },
      "transportation": { name: "Committee on Transportation and Infrastructure" },
      "veterans": { name: "Committee on Veterans" },
      "women-gender": { name: "Committee on Women and Gender Equity" },
      // Subcommittees
      "subcommittee-seniors-food": { name: "Subcommittee on Senior Centers and Food Insecurity" },
      "subcommittee-covid": { name: "Subcommittee on COVID & Infectious Diseases" },
      "subcommittee-landmarks": { name: "Subcommittee on Landmarks, Public Sitings, and Dispositions" },
      "subcommittee-zoning": { name: "Subcommittee on Zoning and Franchises" },
      // Task Forces
      "taskforce-hate": { name: "Taskforce to Combat Hate" }
    }
  },
  "state-authorities": {
    name: "State Authorities",
    children: {
      "mta": {
        name: "MTA",
        children: {
          // Main Board
          "board": { name: "MTA Board (Regular Meetings)" },
          // Committees
          "finance": { name: "Finance Committee" },
          "capital-program": { name: "Capital Program Committee" },
          "safety": { name: "Safety Committee" },
          "audit": { name: "Audit Committee" },
          // Agency-specific committees
          "nyct-bus": { name: "NYC Transit/MTA Bus Committee" },
          "lirr-mnr": { name: "Joint LIRR/Metro-North Committee" },
          "bridges-tunnels": { name: "Bridges & Tunnels Committee" }
        }
      }
    }
  },
  "city-agencies": {
    name: "City Agencies",
    children: {
      "dot": { name: "Department of Transportation (DOT)" },
      "dob": { name: "Department of Buildings (DOB)" },
      "doe": {
        name: "Department of Education (DOE)",
        children: {
          "all": { name: "All Public Meetings" },
          "pep": { name: "Panel for Educational Policy" }
        }
      }
    }
  },
  "community-boards": {
    name: "Community Boards",
    children: {
      "manhattan": {
        name: "Manhattan",
        children: {
          "1": { name: "CB1 - Financial District, Battery Park City, Tribeca" },
          "2": { name: "CB2 - Greenwich Village, SoHo, NoHo" },
          "3": { name: "CB3 - East Village, Lower East Side, Chinatown" },
          "4": { name: "CB4 - Chelsea, Hell's Kitchen" },
          "5": { name: "CB5 - Midtown" },
          "6": { name: "CB6 - Murray Hill, Gramercy Park, Stuyvesant Town" },
          "7": { name: "CB7 - Upper West Side, Lincoln Square" },
          "8": { name: "CB8 - Upper East Side, Roosevelt Island" },
          "9": { name: "CB9 - Morningside Heights, Hamilton Heights" },
          "10": { name: "CB10 - Central Harlem" },
          "11": { name: "CB11 - East Harlem" },
          "12": { name: "CB12 - Washington Heights, Inwood" }
        }
      }
    }
  }
};

// Helper function to flatten hierarchy into a list of all selectable orgs
function getAllSelectableOrgs(orgs = organizations, prefix = "") {
  const result = [];

  for (const [key, value] of Object.entries(orgs)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value.children) {
      // Has children - recurse
      result.push(...getAllSelectableOrgs(value.children, fullKey));
    } else {
      // Leaf node - this is selectable
      result.push({ key: fullKey, name: value.name });
    }
  }

  return result;
}

// Helper to get org name from dot-notation key
function getOrgName(key) {
  const parts = key.split(".");
  let current = organizations;

  for (const part of parts) {
    if (current[part]) {
      current = current[part].children || current[part];
    } else {
      return null;
    }
  }

  return current.name || null;
}

module.exports = { organizations, getAllSelectableOrgs, getOrgName };
