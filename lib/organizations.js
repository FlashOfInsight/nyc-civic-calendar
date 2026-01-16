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
          "1": {
            name: "CB1 - Financial District, Battery Park City, Tribeca",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "landmarks": { name: "Landmarks & Preservation" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "licensing": { name: "Licensing & Permits" },
              "youth-education": { name: "Youth & Education" },
              "quality-of-life": { name: "Quality of Life & Housing" }
            }
          },
          "2": {
            name: "CB2 - Greenwich Village, SoHo, NoHo",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Housing" },
              "landmarks": { name: "Landmarks" },
              "traffic": { name: "Traffic & Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "sla": { name: "SLA Licensing" },
              "schools": { name: "Schools & Education" },
              "quality-of-life": { name: "Quality of Life" }
            }
          },
          "3": {
            name: "CB3 - East Village, Lower East Side, Chinatown",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use, Zoning & Housing" },
              "landmarks": { name: "Landmarks" },
              "transportation": { name: "Transportation & Public Safety" },
              "parks": { name: "Parks, Recreation & Waterfront" },
              "sla": { name: "SLA Licensing & Outdoor Dining" },
              "health": { name: "Health, Seniors & Human Services" }
            }
          },
          "4": {
            name: "CB4 - Chelsea, Hell's Kitchen",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "landmarks": { name: "Landmarks" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "business": { name: "Business Licenses" },
              "housing": { name: "Housing & Human Services" }
            }
          },
          "5": {
            name: "CB5 - Midtown",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use, Housing & Zoning" },
              "landmarks": { name: "Landmarks" },
              "transportation": { name: "Transportation & Environment" },
              "parks": { name: "Parks & Public Spaces" },
              "business": { name: "Business Affairs" }
            }
          },
          "6": {
            name: "CB6 - Murray Hill, Gramercy Park, Stuyvesant Town",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Waterfront" },
              "landmarks": { name: "Parks, Landmarks & Cultural Affairs" },
              "transportation": { name: "Transportation" },
              "business": { name: "Business Affairs & Licensing" },
              "housing": { name: "Housing & Homelessness" },
              "health": { name: "Health & Education" },
              "public-safety": { name: "Public Safety & Sanitation" }
            }
          },
          "7": {
            name: "CB7 - Upper West Side, Lincoln Square",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use" },
              "preservation": { name: "Preservation" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Environment" },
              "business": { name: "Business & Consumer Issues" },
              "health": { name: "Health & Human Services" }
            }
          },
          "8": {
            name: "CB8 - Upper East Side, Roosevelt Island",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use" },
              "landmarks": { name: "Landmarks" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "zoning": { name: "Zoning, Development & Housing" },
              "small-business": { name: "Small Business" },
              "health": { name: "Health, Seniors & Social Services" },
              "street-life": { name: "Street Life" }
            }
          },
          "9": {
            name: "CB9 - Morningside Heights, Hamilton Heights",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Housing, Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Environment" },
              "health": { name: "Health & Environment" }
            }
          },
          "10": {
            name: "CB10 - Central Harlem",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Housing" },
              "landmarks": { name: "Transportation, Landmarks & Historic Preservation" },
              "parks": { name: "Parks & Recreation" },
              "economic": { name: "Economic Development & Technology" },
              "arts": { name: "Arts & Culture" },
              "education": { name: "Education, Youth & Libraries" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" }
            }
          },
          "11": {
            name: "CB11 - East Harlem",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use" },
              "parks": { name: "Parks & Recreation" },
              "housing": { name: "Housing & Human Services" },
              "health": { name: "Health & Environment" }
            }
          },
          "12": {
            name: "CB12 - Washington Heights, Inwood",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use" },
              "traffic": { name: "Traffic & Transportation" },
              "parks": { name: "Parks & Cultural Affairs" },
              "licensing": { name: "Licensing" },
              "business": { name: "Business Development" },
              "housing": { name: "Housing & Human Services" },
              "health": { name: "Health & Environment" },
              "youth": { name: "Youth & Education" },
              "public-safety": { name: "Public Safety" }
            }
          }
        }
      },
      "brooklyn": {
        name: "Brooklyn",
        children: {
          "1": {
            name: "CB1 - Greenpoint, Williamsburg",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use, ULURP & Landmarks" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "licensing": { name: "SLA Review" },
              "housing": { name: "Housing" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental Protection" }
            }
          },
          "2": {
            name: "CB2 - Downtown Brooklyn, Brooklyn Heights, DUMBO, Fort Greene",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use" },
              "transportation": { name: "Transportation & Public Safety" },
              "economic": { name: "Economic Development" },
              "housing": { name: "Housing" },
              "health": { name: "Human Services" }
            }
          },
          "3": {
            name: "CB3 - Bedford-Stuyvesant",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Recreation" },
              "licensing": { name: "Permits & Licenses" },
              "housing": { name: "Housing" },
              "public-safety": { name: "Public Safety" },
              "health": { name: "Health & Human Services" }
            }
          },
          "4": {
            name: "CB4 - Bushwick",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Housing & Land Use" },
              "parks": { name: "Parks & Recreation" },
              "licensing": { name: "Permits & Licenses" },
              "transportation": { name: "Transportation" },
              "public-safety": { name: "Public Safety" },
              "education": { name: "Youth & Education" },
              "health": { name: "Sanitation, Health & Environment" }
            }
          },
          "5": {
            name: "CB5 - East New York, Cypress Hills",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Housing" },
              "transportation": { name: "Transportation & TLC" },
              "public-safety": { name: "Public Safety & Quality of Life" },
              "parks": { name: "Parks & Recreation" },
              "health": { name: "Health & Human Services" },
              "economic": { name: "Economic Development" }
            }
          },
          "6": {
            name: "CB6 - Park Slope, Carroll Gardens, Red Hook, Gowanus",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Landmarks, Land Use & Housing" },
              "transportation": { name: "Transportation, Parks & Public Infrastructure" },
              "licensing": { name: "Business & Licenses" },
              "health": { name: "Human Services & Environmental Sustainability" }
            }
          },
          "7": {
            name: "CB7 - Sunset Park, Windsor Terrace",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use" },
              "economic": { name: "Economic Development & Waterfront" },
              "parks": { name: "Parks" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Sanitation & Environment" },
              "transportation": { name: "Transportation" }
            }
          },
          "8": {
            name: "CB8 - Crown Heights, Prospect Heights",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Housing & Land Use" },
              "economic": { name: "Economic Development" },
              "transportation": { name: "Environment, Sanitation & Transportation" },
              "health": { name: "Health & Human Services" },
              "parks": { name: "Parks, Youth & Education" },
              "public-safety": { name: "Public Safety" },
              "seniors": { name: "Seniors" },
              "licensing": { name: "SLA & Sidewalk Cafe Review" },
              "veterans": { name: "Veterans" }
            }
          },
          "9": {
            name: "CB9 - Crown Heights, Prospect Lefferts Gardens",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "ULURP" },
              "economic": { name: "Economic Development" },
              "education": { name: "Education & Library" },
              "environment": { name: "Environmental Protection" },
              "health": { name: "Health & Social Services" },
              "housing": { name: "Housing" },
              "parks": { name: "Parks, Recreation & Culture" },
              "public-safety": { name: "Public Safety" },
              "transportation": { name: "Transportation" },
              "youth": { name: "Youth Services" }
            }
          },
          "10": {
            name: "CB10 - Bay Ridge, Dyker Heights, Fort Hamilton",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Zoning & Land Use" },
              "parks": { name: "Parks" },
              "public-safety": { name: "Police & Public Safety" },
              "health": { name: "Older Adult Issues, Housing, Health & Welfare" },
              "education": { name: "Youth Services, Education & Libraries" }
            }
          },
          "11": {
            name: "CB11 - Bensonhurst, Bath Beach, Gravesend",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Planning & Zoning" },
              "housing": { name: "Housing & Landmarks" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Libraries" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Sanitation & Environment" },
              "health": { name: "Health, Social Services & Seniors" },
              "education": { name: "Youth & Education" },
              "economic": { name: "Commercial Development" }
            }
          },
          "12": {
            name: "CB12 - Borough Park, Kensington",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks" },
              "public-safety": { name: "Public Safety" },
              "health": { name: "Health & Human Services" }
            }
          },
          "13": {
            name: "CB13 - Coney Island, Brighton Beach, Gravesend",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use, Zoning, Landmarks & Planning" },
              "economic": { name: "Economic Development" },
              "education": { name: "Education, Library & Youth Services" },
              "environment": { name: "Environment & Sanitation" },
              "health": { name: "Health, Aging & Social Services" },
              "housing": { name: "Housing" },
              "licensing": { name: "Licensing" },
              "parks": { name: "Parks & Recreation" },
              "public-safety": { name: "Public Safety & Fire" },
              "resiliency": { name: "Resiliency" },
              "transportation": { name: "Transportation" }
            }
          },
          "14": {
            name: "CB14 - Flatbush, Midwood",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Housing & Land Use" },
              "transportation": { name: "Transportation" },
              "public-safety": { name: "Community Safety" },
              "health": { name: "Human Services" },
              "education": { name: "Youth Services, Education & Libraries" },
              "economic": { name: "Community Environment, Cultural Affairs & Economic Development" }
            }
          },
          "15": {
            name: "CB15 - Sheepshead Bay, Manhattan Beach, Gerritsen Beach",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Zoning" },
              "transportation": { name: "Transportation & Transit" },
              "parks": { name: "Parks & Cultural Affairs" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental Protection & Sanitation" },
              "health": { name: "Health Services" },
              "education": { name: "Education" },
              "economic": { name: "Consumer Affairs & Economic Development" }
            }
          },
          "16": {
            name: "CB16 - Brownsville, Ocean Hill",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use, Planning & Zoning" },
              "economic": { name: "Economic Development" },
              "education": { name: "Education & Youth Services" },
              "environment": { name: "Environmental & Sanitation" },
              "health": { name: "Health & Human Services" },
              "housing": { name: "NYCHA" },
              "parks": { name: "Parks & Recreation" },
              "public-safety": { name: "Public Safety" },
              "seniors": { name: "Senior Citizen Affairs" },
              "transportation": { name: "Transportation & Franchises" },
              "veterans": { name: "Veterans Affairs" }
            }
          },
          "17": {
            name: "CB17 - East Flatbush",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "economic": { name: "Commerce" },
              "housing": { name: "Housing & Block Associations" },
              "parks": { name: "Parks & Beautification" },
              "environment": { name: "Sanitation & Environmental Protection" },
              "health": { name: "Social & Health Services" },
              "transportation": { name: "Transportation & Public Safety" },
              "education": { name: "Youth & Education" }
            }
          },
          "18": {
            name: "CB18 - Canarsie, Mill Basin, Flatlands, Marine Park",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Planning & Zoning" },
              "housing": { name: "Housing" },
              "education": { name: "Libraries & Education" },
              "parks": { name: "Parks" },
              "transportation": { name: "Transportation" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Sanitation & Environment" },
              "health": { name: "Social Services, Health & Older Adults" },
              "youth": { name: "Youth & Technology" },
              "licensing": { name: "SLA" }
            }
          }
        }
      },
      "queens": {
        name: "Queens",
        children: {
          "1": {
            name: "CB1 - Astoria, Long Island City",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "landmarks": { name: "Landmarks" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "licensing": { name: "Liquor License Review" },
              "housing": { name: "Housing" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental" }
            }
          },
          "2": {
            name: "CB2 - Woodside, Sunnyside, Long Island City",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Housing" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Environment, Parks & Recreation" },
              "licensing": { name: "Small Business" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "City Services & Public Safety" }
            }
          },
          "3": {
            name: "CB3 - Jackson Heights, East Elmhurst",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "education": { name: "Youth & Education" },
              "economic": { name: "Economic Development" }
            }
          },
          "4": {
            name: "CB4 - Corona, Elmhurst",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks" },
              "health": { name: "Health" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental" },
              "licensing": { name: "Consumer Affairs" },
              "housing": { name: "Neighborhood Stabilization" },
              "youth": { name: "Youth" }
            }
          },
          "5": {
            name: "CB5 - Ridgewood, Glendale, Maspeth, Middle Village",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Recreation" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental" },
              "economic": { name: "Economic Development" }
            }
          },
          "6": {
            name: "CB6 - Forest Hills, Rego Park",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks" },
              "health": { name: "Health & Senior Services" },
              "public-safety": { name: "Public Safety" },
              "education": { name: "Education" },
              "economic": { name: "Economic Development" }
            }
          },
          "7": {
            name: "CB7 - Flushing, Whitestone, College Point",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Environment" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "education": { name: "Youth & Education" },
              "economic": { name: "Economic Development" }
            }
          },
          "8": {
            name: "CB8 - Fresh Meadows, Briarwood, Jamaica Hills",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks" },
              "health": { name: "Health & Social Services" },
              "public-safety": { name: "Public Safety" },
              "education": { name: "Education" },
              "environment": { name: "Environmental" }
            }
          },
          "9": {
            name: "CB9 - Richmond Hill, Woodhaven, Ozone Park, Kew Gardens",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Recreation" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental" },
              "economic": { name: "Economic Development" }
            }
          },
          "10": {
            name: "CB10 - Howard Beach, Ozone Park, South Ozone Park",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Environment" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "economic": { name: "Economic Development" }
            }
          },
          "11": {
            name: "CB11 - Bayside, Douglaston, Little Neck",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Zoning (Douglaston, Little Neck, North Bayside, East Flushing)" },
              "transportation": { name: "Transportation" },
              "landmarks": { name: "Landmarks" },
              "parks": { name: "Parks" },
              "health": { name: "Health" },
              "public-safety": { name: "Public Safety & Licensing" },
              "budget": { name: "Budget" }
            }
          },
          "12": {
            name: "CB12 - Jamaica, Hollis, St. Albans",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Recreation" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "housing": { name: "Housing" },
              "economic": { name: "Economic Development" },
              "education": { name: "Youth & Education" }
            }
          },
          "13": {
            name: "CB13 - Queens Village, Cambria Heights, Laurelton, Rosedale",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Recreation" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental" },
              "education": { name: "Youth & Education" }
            }
          },
          "14": {
            name: "CB14 - Far Rockaway, Rockaway, Arverne",
            children: {
              "full-board": { name: "Full Board" },
              "executive": { name: "Executive Committee" },
              "land-use": { name: "Land Use & Zoning" },
              "transportation": { name: "Transportation" },
              "parks": { name: "Parks & Waterfront" },
              "health": { name: "Health & Human Services" },
              "public-safety": { name: "Public Safety" },
              "environment": { name: "Environmental & Resiliency" },
              "economic": { name: "Economic Development" }
            }
          }
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
