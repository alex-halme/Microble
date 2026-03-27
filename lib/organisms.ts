import {
  PATHOGEN_CATALOG,
  type PathogenCatalogEntry,
} from "../data/pathogen-catalog";
import type { Organism } from "./types";

/**
 * Canonical organism dictionary — source of truth for valid answers.
 * All case generation and answer matching defers to this list.
 * Sorted alphabetically by canonical name.
 */
const CORE_BACTERIAL_ORGANISMS: Organism[] = [
  // ── Gram-positive cocci ───────────────────────────────────────────────────
  {
    id: "staphylococcus-aureus",
    canonical: "Staphylococcus aureus",
    genus: "Staphylococcus",
    species: "aureus",
    abbreviations: ["S. aureus", "Staph aureus", "Staph. aureus"],
    commonNames: ["MRSA", "MSSA"],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Clusters of gram-positive cocci; coagulase-positive; leading cause of skin/soft tissue infections, bacteremia, and endocarditis.",
  },
  {
    id: "staphylococcus-epidermidis",
    canonical: "Staphylococcus epidermidis",
    genus: "Staphylococcus",
    species: "epidermidis",
    abbreviations: ["S. epidermidis"],
    commonNames: [],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Coagulase-negative staph; leading cause of prosthetic device and catheter-related infections.",
  },
  {
    id: "streptococcus-pyogenes",
    canonical: "Streptococcus pyogenes",
    genus: "Streptococcus",
    species: "pyogenes",
    abbreviations: ["S. pyogenes", "Strep pyogenes", "GAS"],
    commonNames: ["Group A Strep", "Group A Streptococcus"],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Beta-hemolytic; causes pharyngitis, impetigo, necrotizing fasciitis; post-infectious complications include rheumatic fever and PSGN.",
  },
  {
    id: "streptococcus-agalactiae",
    canonical: "Streptococcus agalactiae",
    genus: "Streptococcus",
    species: "agalactiae",
    abbreviations: ["S. agalactiae", "GBS"],
    commonNames: ["Group B Strep", "Group B Streptococcus"],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Leading cause of neonatal meningitis and sepsis; colonizes maternal vaginal tract.",
  },
  {
    id: "streptococcus-pneumoniae",
    canonical: "Streptococcus pneumoniae",
    genus: "Streptococcus",
    species: "pneumoniae",
    abbreviations: ["S. pneumoniae", "Strep pneumo"],
    commonNames: ["Pneumococcus"],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Lancet-shaped diplococci; leading cause of community-acquired pneumonia, bacterial meningitis, and otitis media.",
  },
  {
    id: "enterococcus-faecalis",
    canonical: "Enterococcus faecalis",
    genus: "Enterococcus",
    species: "faecalis",
    abbreviations: ["E. faecalis"],
    commonNames: [],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Part of normal GI flora; causes nosocomial UTIs and endocarditis; intrinsically resistant to cephalosporins.",
  },
  {
    id: "enterococcus-faecium",
    canonical: "Enterococcus faecium",
    genus: "Enterococcus",
    species: "faecium",
    abbreviations: ["E. faecium"],
    commonNames: ["VRE"],
    gramStain: "positive",
    morphology: "cocci",
    oxygen: "facultative",
    notes: "Hospital-acquired; vancomycin-resistant strains (VRE) are a major therapeutic challenge.",
  },
  // ── Gram-positive bacilli ─────────────────────────────────────────────────
  {
    id: "listeria-monocytogenes",
    canonical: "Listeria monocytogenes",
    genus: "Listeria",
    species: "monocytogenes",
    abbreviations: ["L. monocytogenes"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Motile at room temp (tumbling motility); causes meningitis in neonates, elderly, and immunocompromised; associated with deli meats and soft cheeses.",
  },
  {
    id: "bacillus-anthracis",
    canonical: "Bacillus anthracis",
    genus: "Bacillus",
    species: "anthracis",
    abbreviations: ["B. anthracis"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Spore-forming; causes cutaneous, pulmonary (woolsorter's disease), and GI anthrax; Tier 1 bioterrorism agent.",
  },
  {
    id: "bacillus-cereus",
    canonical: "Bacillus cereus",
    genus: "Bacillus",
    species: "cereus",
    abbreviations: ["B. cereus"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Two toxin syndromes: emetic (reheated rice, rapid onset) and diarrheal (meat/vegetables, delayed onset).",
  },
  {
    id: "clostridium-tetani",
    canonical: "Clostridium tetani",
    genus: "Clostridium",
    species: "tetani",
    abbreviations: ["C. tetani"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "anaerobe",
    notes: "Tetanospasmin toxin blocks inhibitory neurotransmitters; causes trismus, risus sardonicus, opisthotonus.",
  },
  {
    id: "clostridium-botulinum",
    canonical: "Clostridium botulinum",
    genus: "Clostridium",
    species: "botulinum",
    abbreviations: ["C. botulinum"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "anaerobe",
    notes: "Botulinum toxin blocks ACh release at NMJ; causes descending flaccid paralysis; associated with home-canned foods and infant honey ingestion.",
  },
  {
    id: "clostridioides-difficile",
    canonical: "Clostridioides difficile",
    genus: "Clostridioides",
    species: "difficile",
    abbreviations: ["C. difficile", "C. diff"],
    commonNames: ["C. diff"],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "anaerobe",
    notes: "Pseudomembranous colitis after antibiotic disruption of gut flora; toxins A and B; treat with vancomycin PO or fidaxomicin.",
  },
  {
    id: "clostridium-perfringens",
    canonical: "Clostridium perfringens",
    genus: "Clostridium",
    species: "perfringens",
    abbreviations: ["C. perfringens"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "anaerobe",
    notes: "Alpha-toxin (lecithinase); causes gas gangrene and food poisoning; Nagler reaction positive.",
  },
  {
    id: "corynebacterium-diphtheriae",
    canonical: "Corynebacterium diphtheriae",
    genus: "Corynebacterium",
    species: "diphtheriae",
    abbreviations: ["C. diphtheriae"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Club-shaped rods in V/L formations; diphtheria exotoxin inhibits EF-2; pseudomembrane in pharynx; myocarditis and neuropathy.",
  },
  // ── Gram-negative cocci ───────────────────────────────────────────────────
  {
    id: "neisseria-meningitidis",
    canonical: "Neisseria meningitidis",
    genus: "Neisseria",
    species: "meningitidis",
    abbreviations: ["N. meningitidis"],
    commonNames: ["Meningococcus"],
    gramStain: "negative",
    morphology: "cocci",
    oxygen: "aerobe",
    notes: "Kidney-shaped diplococci; causes meningococcal meningitis and Waterhouse-Friderichsen syndrome; petechial/purpuric rash.",
  },
  {
    id: "neisseria-gonorrhoeae",
    canonical: "Neisseria gonorrhoeae",
    genus: "Neisseria",
    species: "gonorrhoeae",
    abbreviations: ["N. gonorrhoeae"],
    commonNames: ["Gonococcus"],
    gramStain: "negative",
    morphology: "cocci",
    oxygen: "aerobe",
    notes: "Intracellular gram-negative diplococci in PMNs; causes gonorrhea, PID, septic arthritis, and ophthalmia neonatorum.",
  },
  {
    id: "moraxella-catarrhalis",
    canonical: "Moraxella catarrhalis",
    genus: "Moraxella",
    species: "catarrhalis",
    abbreviations: ["M. catarrhalis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "cocci",
    oxygen: "aerobe",
    notes: "Produces beta-lactamase; common cause of otitis media and COPD exacerbations.",
  },
  // ── Gram-negative enteric rods ─────────────────────────────────────────────
  {
    id: "escherichia-coli",
    canonical: "Escherichia coli",
    genus: "Escherichia",
    species: "coli",
    abbreviations: ["E. coli"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Most common cause of UTI and gram-negative sepsis; EHEC O157:H7 causes HUS; ETEC causes traveler's diarrhea.",
  },
  {
    id: "klebsiella-pneumoniae",
    canonical: "Klebsiella pneumoniae",
    genus: "Klebsiella",
    species: "pneumoniae",
    abbreviations: ["K. pneumoniae"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Mucoid colonies; currant-jelly sputum; pneumonia in diabetics/alcoholics; ESBL and carbapenem resistance increasing.",
  },
  {
    id: "proteus-mirabilis",
    canonical: "Proteus mirabilis",
    genus: "Proteus",
    species: "mirabilis",
    abbreviations: ["P. mirabilis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Urease-positive; alkalinizes urine; struvite kidney stones; swarming motility.",
  },
  {
    id: "salmonella-typhi",
    canonical: "Salmonella typhi",
    genus: "Salmonella",
    species: "typhi",
    abbreviations: ["S. typhi"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Typhoid fever; rose spots; relative bradycardia; Widal test; chronic carriers harbor organism in gallbladder.",
  },
  {
    id: "salmonella-enteritidis",
    canonical: "Salmonella enteritidis",
    genus: "Salmonella",
    species: "enteritidis",
    abbreviations: ["S. enteritidis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Non-typhoidal salmonellosis; associated with poultry and eggs; self-limiting gastroenteritis.",
  },
  {
    id: "shigella-sonnei",
    canonical: "Shigella sonnei",
    genus: "Shigella",
    species: "sonnei",
    abbreviations: ["S. sonnei"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Most common Shigella in developed world; non-invasive, Shiga toxin-mediated; very low infectious dose.",
  },
  {
    id: "shigella-dysenteriae",
    canonical: "Shigella dysenteriae",
    genus: "Shigella",
    species: "dysenteriae",
    abbreviations: ["S. dysenteriae"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Most virulent Shigella; Shiga toxin can cause HUS; dysentery with bloody diarrhea.",
  },
  {
    id: "yersinia-pestis",
    canonical: "Yersinia pestis",
    genus: "Yersinia",
    species: "pestis",
    abbreviations: ["Y. pestis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Bipolar (safety-pin) staining; bubonic, septicemic, and pneumonic plague; flea vector (Xenopsylla cheopis).",
  },
  {
    id: "yersinia-enterocolitica",
    canonical: "Yersinia enterocolitica",
    genus: "Yersinia",
    species: "enterocolitica",
    abbreviations: ["Y. enterocolitica"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Mesenteric adenitis mimicking appendicitis; associated with pork; reactive arthritis post-infection.",
  },
  {
    id: "serratia-marcescens",
    canonical: "Serratia marcescens",
    genus: "Serratia",
    species: "marcescens",
    abbreviations: ["S. marcescens"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Red pigment (prodigiosin); nosocomial UTI and pneumonia; intrinsic resistance to ampicillin.",
  },
  {
    id: "enterobacter-cloacae",
    canonical: "Enterobacter cloacae",
    genus: "Enterobacter",
    species: "cloacae",
    abbreviations: ["E. cloacae"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Nosocomial pathogen; inducible AmpC beta-lactamase; treat with carbapenems.",
  },
  // ── Gram-negative obligate aerobes / non-fermenters ────────────────────────
  {
    id: "pseudomonas-aeruginosa",
    canonical: "Pseudomonas aeruginosa",
    genus: "Pseudomonas",
    species: "aeruginosa",
    abbreviations: ["P. aeruginosa"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Blue-green pigment (pyocyanin); fruity/grape-like odor; major pathogen in CF, burn wounds, neutropenic patients; extensive intrinsic resistance.",
  },
  {
    id: "acinetobacter-baumannii",
    canonical: "Acinetobacter baumannii",
    genus: "Acinetobacter",
    species: "baumannii",
    abbreviations: ["A. baumannii"],
    commonNames: [],
    gramStain: "negative",
    morphology: "cocci",
    oxygen: "aerobe",
    notes: "Nosocomial pathogen; extensively drug-resistant; associated with ventilator-associated pneumonia and wound infections in military trauma.",
  },
  {
    id: "vibrio-cholerae",
    canonical: "Vibrio cholerae",
    genus: "Vibrio",
    species: "cholerae",
    abbreviations: ["V. cholerae"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Comma-shaped; cholera toxin activates adenylyl cyclase; massive rice-water diarrhea; grows in alkaline media.",
  },
  {
    id: "vibrio-vulnificus",
    canonical: "Vibrio vulnificus",
    genus: "Vibrio",
    species: "vulnificus",
    abbreviations: ["V. vulnificus"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Raw oyster consumption or wound exposure to seawater; rapidly fatal septicemia in liver disease patients.",
  },
  {
    id: "haemophilus-influenzae",
    canonical: "Haemophilus influenzae",
    genus: "Haemophilus",
    species: "influenzae",
    abbreviations: ["H. influenzae"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Requires factors X and V; type b causes epiglottitis and meningitis (pre-vaccine); unencapsulated causes COPD exacerbations.",
  },
  {
    id: "legionella-pneumophila",
    canonical: "Legionella pneumophila",
    genus: "Legionella",
    species: "pneumophila",
    abbreviations: ["L. pneumophila"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Poorly gram-staining; silver stain or DFA; grows on BCYE agar; urine antigen test; spread by contaminated water systems/air conditioning.",
  },
  {
    id: "campylobacter-jejuni",
    canonical: "Campylobacter jejuni",
    genus: "Campylobacter",
    species: "jejuni",
    abbreviations: ["C. jejuni"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "microaerophilic",
    notes: "S-shaped or seagull-shaped; most common bacterial diarrhea in US; associated with poultry; post-infection Guillain-Barré syndrome.",
  },
  {
    id: "helicobacter-pylori",
    canonical: "Helicobacter pylori",
    genus: "Helicobacter",
    species: "pylori",
    abbreviations: ["H. pylori"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "microaerophilic",
    notes: "Urease-positive; causes peptic ulcer disease and gastric adenocarcinoma; urea breath test or stool antigen for diagnosis.",
  },
  // ── Gram-negative anaerobes ────────────────────────────────────────────────
  {
    id: "bacteroides-fragilis",
    canonical: "Bacteroides fragilis",
    genus: "Bacteroides",
    species: "fragilis",
    abbreviations: ["B. fragilis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "anaerobe",
    notes: "Most common anaerobic pathogen; polysaccharide capsule; intra-abdominal abscesses; resistant to penicillin (beta-lactamase).",
  },
  // ── Mycobacteria (acid-fast) ───────────────────────────────────────────────
  {
    id: "mycobacterium-tuberculosis",
    canonical: "Mycobacterium tuberculosis",
    genus: "Mycobacterium",
    species: "tuberculosis",
    abbreviations: ["M. tuberculosis", "MTB"],
    commonNames: ["TB"],
    gramStain: "none",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Slow-growing; cord factor; Ziehl-Neelsen stain; upper lobe cavitary lesions; Ghon complex in primary infection.",
  },
  {
    id: "mycobacterium-avium",
    canonical: "Mycobacterium avium",
    genus: "Mycobacterium",
    species: "avium",
    abbreviations: ["M. avium", "MAC", "MAI"],
    commonNames: ["MAC"],
    gramStain: "none",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Disseminated infection in advanced HIV (CD4 < 50); lymphadenopathy, fever, night sweats; prophylaxis with azithromycin.",
  },
  {
    id: "mycobacterium-leprae",
    canonical: "Mycobacterium leprae",
    genus: "Mycobacterium",
    species: "leprae",
    abbreviations: ["M. leprae"],
    commonNames: [],
    gramStain: "none",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Cannot be cultured in vitro; leprosy; tuberculoid vs lepromatous forms; armadillo reservoir; affects peripheral nerves.",
  },
  // ── Spirochetes ───────────────────────────────────────────────────────────
  {
    id: "treponema-pallidum",
    canonical: "Treponema pallidum",
    genus: "Treponema",
    species: "pallidum",
    abbreviations: ["T. pallidum"],
    commonNames: [],
    gramStain: "none",
    morphology: "spirochete",
    oxygen: "microaerophilic",
    notes: "Cannot be cultured; syphilis; primary (painless chancre), secondary (diffuse rash including palms/soles), tertiary (gummas, tabes dorsalis, Argyll Robertson pupil).",
  },
  {
    id: "borrelia-burgdorferi",
    canonical: "Borrelia burgdorferi",
    genus: "Borrelia",
    species: "burgdorferi",
    abbreviations: ["B. burgdorferi"],
    commonNames: [],
    gramStain: "none",
    morphology: "spirochete",
    oxygen: "microaerophilic",
    notes: "Lyme disease; Ixodes tick vector; erythema migrans rash; cardiac (AV block), neurologic (Bell's palsy), and arthritic manifestations.",
  },
  {
    id: "leptospira-interrogans",
    canonical: "Leptospira interrogans",
    genus: "Leptospira",
    species: "interrogans",
    abbreviations: ["L. interrogans"],
    commonNames: [],
    gramStain: "none",
    morphology: "spirochete",
    oxygen: "aerobe",
    notes: "Leptospirosis; animal urine exposure; biphasic illness; Weil's disease (jaundice + renal failure + hemorrhage).",
  },
  // ── Atypical / Obligate intracellular ─────────────────────────────────────
  {
    id: "chlamydia-trachomatis",
    canonical: "Chlamydia trachomatis",
    genus: "Chlamydia",
    species: "trachomatis",
    abbreviations: ["C. trachomatis"],
    commonNames: [],
    gramStain: "none",
    morphology: "other",
    oxygen: "aerobe",
    notes: "No cell wall; obligate intracellular; most common bacterial STI; serovars D-K cause urethritis/PID; serovars A-C cause trachoma; L1-L3 cause LGV.",
  },
  {
    id: "chlamydia-pneumoniae",
    canonical: "Chlamydia pneumoniae",
    genus: "Chlamydia",
    species: "pneumoniae",
    abbreviations: ["C. pneumoniae"],
    commonNames: [],
    gramStain: "none",
    morphology: "other",
    oxygen: "aerobe",
    notes: "Atypical community-acquired pneumonia; hoarseness and pharyngitis preceding pneumonia; treat with macrolides.",
  },
  {
    id: "mycoplasma-pneumoniae",
    canonical: "Mycoplasma pneumoniae",
    genus: "Mycoplasma",
    species: "pneumoniae",
    abbreviations: ["M. pneumoniae"],
    commonNames: [],
    gramStain: "none",
    morphology: "other",
    oxygen: "facultative",
    notes: "No cell wall; walking pneumonia; cold agglutinins (IgM); Eaton agent; bilateral patchy infiltrates on CXR.",
  },
  {
    id: "rickettsia-rickettsii",
    canonical: "Rickettsia rickettsii",
    genus: "Rickettsia",
    species: "rickettsii",
    abbreviations: ["R. rickettsii"],
    commonNames: [],
    gramStain: "none",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Rocky Mountain Spotted Fever; Dermacentor tick; centripetal rash (starts on wrists/ankles, spreads to trunk); treat with doxycycline.",
  },
  {
    id: "coxiella-burnetii",
    canonical: "Coxiella burnetii",
    genus: "Coxiella",
    species: "burnetii",
    abbreviations: ["C. burnetii"],
    commonNames: [],
    gramStain: "none",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Q fever; inhaled from infected animals (cattle, sheep, goats); atypical pneumonia + hepatitis; no rash; seronegative initially.",
  },
  {
    id: "francisella-tularensis",
    canonical: "Francisella tularensis",
    genus: "Francisella",
    species: "tularensis",
    abbreviations: ["F. tularensis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Tularemia; rabbit and tick vector; ulceroglandular (most common), typhoidal, pneumonic forms; BSL-3 agent.",
  },
  {
    id: "brucella-melitensis",
    canonical: "Brucella melitensis",
    genus: "Brucella",
    species: "melitensis",
    abbreviations: ["B. melitensis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Brucellosis; goat/sheep; unpasteurized cheese; undulant fever; hepatosplenomegaly; osteomyelitis of vertebrae.",
  },
  {
    id: "bordetella-pertussis",
    canonical: "Bordetella pertussis",
    genus: "Bordetella",
    species: "pertussis",
    abbreviations: ["B. pertussis"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Whooping cough; catarrhal → paroxysmal (inspiratory whoop) → convalescent stages; pertussis toxin; Bordet-Gengou agar.",
  },
  {
    id: "burkholderia-pseudomallei",
    canonical: "Burkholderia pseudomallei",
    genus: "Burkholderia",
    species: "pseudomallei",
    abbreviations: ["B. pseudomallei"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Melioidosis; endemic in SE Asia and northern Australia; bipolar safety-pin staining; pneumonia, sepsis, or localized infection; treat with ceftazidime then TMP-SMX.",
  },
  {
    id: "burkholderia-cepacia",
    canonical: "Burkholderia cepacia",
    genus: "Burkholderia",
    species: "cepacia",
    abbreviations: ["B. cepacia"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Opportunistic pathogen in cystic fibrosis; person-to-person transmission; cepacia syndrome (rapid fatal deterioration); pan-resistant strains common.",
  },
  {
    id: "pasteurella-multocida",
    canonical: "Pasteurella multocida",
    genus: "Pasteurella",
    species: "multocida",
    abbreviations: ["P. multocida"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "facultative",
    notes: "Animal bite (cat > dog) wound infection; rapidly progressing cellulitis; treat with amoxicillin-clavulanate.",
  },
  {
    id: "bartonella-henselae",
    canonical: "Bartonella henselae",
    genus: "Bartonella",
    species: "henselae",
    abbreviations: ["B. henselae"],
    commonNames: [],
    gramStain: "negative",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Cat scratch disease; cat flea vector; regional lymphadenopathy; bacillary angiomatosis in HIV; Warthin-Starry silver stain.",
  },
  {
    id: "nocardia-asteroides",
    canonical: "Nocardia asteroides",
    genus: "Nocardia",
    species: "asteroides",
    abbreviations: ["N. asteroides"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "aerobe",
    notes: "Weakly acid-fast; branching gram-positive rods; pulmonary and CNS abscesses in immunocompromised; treat with TMP-SMX.",
  },
  {
    id: "actinomyces-israelii",
    canonical: "Actinomyces israelii",
    genus: "Actinomyces",
    species: "israelii",
    abbreviations: ["A. israelii"],
    commonNames: [],
    gramStain: "positive",
    morphology: "bacilli",
    oxygen: "anaerobe",
    notes: "NOT acid-fast (unlike Nocardia); sulfur granules in draining sinus tracts; cervicofacial, thoracic, abdominal forms; treat with penicillin G.",
  },
];

const ORGANISM_ALIAS_OVERRIDES: Record<
  string,
  Pick<Organism, "abbreviations" | "commonNames" | "classificationTags" | "notes">
> = {
  "human-immunodeficiency-virus-1": {
    abbreviations: ["HIV-1", "HIV 1", "HIV"],
    commonNames: ["Human immunodeficiency virus", "AIDS virus"],
    classificationTags: ["Virus", "RNA virus", "Retrovirus"],
    notes:
      "Lentiviral retrovirus that targets CD4-positive T cells and causes progressive immunodeficiency if untreated.",
  },
  "human-papillomavirus": {
    abbreviations: ["HPV"],
    commonNames: ["Human papillomavirus"],
    classificationTags: ["Virus", "DNA virus", "Papillomavirus"],
    notes:
      "DNA virus associated with cutaneous and anogenital warts, cervical dysplasia, and several HPV-driven cancers.",
  },
  "influenza-a-virus": {
    abbreviations: ["Influenza A", "Flu A"],
    commonNames: ["Flu", "Seasonal influenza"],
    classificationTags: ["Virus", "RNA virus", "Orthomyxovirus"],
    notes:
      "Segmented negative-sense RNA virus that causes seasonal influenza and pandemic respiratory disease.",
  },
  "influenza-b-virus": {
    abbreviations: ["Influenza B", "Flu B"],
    commonNames: [],
    classificationTags: ["Virus", "RNA virus", "Orthomyxovirus"],
    notes:
      "Segmented negative-sense RNA virus that contributes to seasonal influenza outbreaks.",
  },
  "hepatitis-b-virus": {
    abbreviations: ["HBV"],
    commonNames: ["Hepatitis B"],
    classificationTags: ["Virus", "DNA virus", "Hepadnavirus"],
    notes:
      "Partially double-stranded DNA virus that can cause acute hepatitis, chronic liver disease, and hepatocellular carcinoma.",
  },
  "hepatitis-c-virus": {
    abbreviations: ["HCV"],
    commonNames: ["Hepatitis C"],
    classificationTags: ["Virus", "RNA virus", "Flavivirus"],
    notes:
      "Enveloped RNA virus associated with chronic hepatitis, cirrhosis, and hepatocellular carcinoma.",
  },
  "hepatitis-a-virus": {
    abbreviations: ["HAV"],
    commonNames: ["Hepatitis A"],
    classificationTags: ["Virus", "RNA virus", "Picornavirus"],
    notes:
      "Non-enveloped RNA virus that causes acute fecal-oral hepatitis without chronic infection.",
  },
  "varicella-zoster-virus": {
    abbreviations: ["VZV"],
    commonNames: ["Chickenpox virus", "Shingles virus"],
    classificationTags: ["Virus", "DNA virus", "Herpesvirus"],
    notes:
      "Neurotropic herpesvirus that causes varicella in primary infection and shingles after reactivation.",
  },
  "epstein-barr-virus": {
    abbreviations: ["EBV"],
    commonNames: ["Mono virus"],
    classificationTags: ["Virus", "DNA virus", "Herpesvirus"],
    notes:
      "Herpesvirus linked to infectious mononucleosis and several lymphoid and epithelial malignancies.",
  },
  cytomegalovirus: {
    abbreviations: ["CMV"],
    commonNames: [],
    classificationTags: ["Virus", "DNA virus", "Herpesvirus"],
    notes:
      "Herpesvirus causing congenital infection, retinitis, and invasive disease in immunocompromised patients.",
  },
  "herpes-simplex-virus-1": {
    abbreviations: ["HSV-1", "HSV 1"],
    commonNames: ["Herpes simplex 1"],
    classificationTags: ["Virus", "DNA virus", "Herpesvirus"],
    notes:
      "Herpesvirus commonly associated with orolabial lesions and encephalitis.",
  },
  "herpes-simplex-virus-2": {
    abbreviations: ["HSV-2", "HSV 2"],
    commonNames: ["Herpes simplex 2"],
    classificationTags: ["Virus", "DNA virus", "Herpesvirus"],
    notes:
      "Herpesvirus commonly associated with genital lesions and neonatal herpes.",
  },
  "sars-cov-2": {
    abbreviations: ["COVID-19 virus", "COVID 19 virus"],
    commonNames: ["COVID-19", "Coronavirus"],
    classificationTags: ["Virus", "RNA virus", "Coronavirus"],
    notes:
      "Betacoronavirus causing COVID-19, with a clinical spectrum from mild upper respiratory illness to severe pneumonia and thrombosis.",
  },
  "respiratory-syncytial-virus": {
    abbreviations: ["RSV"],
    commonNames: ["Respiratory syncytial virus"],
    classificationTags: ["Virus", "RNA virus", "Paramyxovirus"],
    notes:
      "RNA virus that causes bronchiolitis and pneumonia, especially in infants and older adults.",
  },
  "measles-virus": {
    abbreviations: [],
    commonNames: ["Measles", "Rubeola"],
    classificationTags: ["Virus", "RNA virus", "Paramyxovirus"],
    notes:
      "Highly contagious RNA virus causing fever, cough, conjunctivitis, Koplik spots, and a descending rash.",
  },
  "mumps-virus": {
    abbreviations: [],
    commonNames: ["Mumps"],
    classificationTags: ["Virus", "RNA virus", "Paramyxovirus"],
    notes:
      "Paramyxovirus associated with parotitis, orchitis, and aseptic meningitis.",
  },
  "rubella-virus": {
    abbreviations: [],
    commonNames: ["Rubella", "German measles"],
    classificationTags: ["Virus", "RNA virus", "Togavirus"],
    notes:
      "RNA virus causing mild rash illness but severe congenital infection in pregnancy.",
  },
  "rabies-virus": {
    abbreviations: [],
    commonNames: ["Rabies"],
    classificationTags: ["Virus", "RNA virus", "Rhabdovirus"],
    notes:
      "Neurotropic virus transmitted by animal bites that causes progressive fatal encephalitis if prophylaxis is delayed.",
  },
  "giardia-lamblia": {
    abbreviations: [],
    commonNames: ["Giardia"],
    classificationTags: ["Parasite", "Protozoan", "Flagellate"],
    notes:
      "Flagellated protozoan that causes malabsorptive diarrhea after ingestion of contaminated water.",
  },
  "toxoplasma-gondii": {
    abbreviations: [],
    commonNames: ["Toxo"],
    classificationTags: ["Parasite", "Protozoan", "Intracellular"],
    notes:
      "Intracellular protozoan associated with congenital infection and CNS disease in advanced immunosuppression.",
  },
  "plasmodium-falciparum": {
    abbreviations: [],
    commonNames: ["Falciparum malaria"],
    classificationTags: ["Parasite", "Protozoan", "Malaria"],
    notes:
      "Protozoan parasite causing severe malaria, including cerebral malaria and hemolytic complications.",
  },
  "enterobius-vermicularis": {
    abbreviations: [],
    commonNames: ["Pinworm"],
    classificationTags: ["Parasite", "Helminth", "Nematode"],
    notes:
      "Nematode causing nocturnal perianal pruritus and diagnosed with the adhesive tape test.",
  },
  "ascaris-lumbricoides": {
    abbreviations: [],
    commonNames: ["Ascaris"],
    classificationTags: ["Parasite", "Helminth", "Nematode"],
    notes:
      "Large intestinal nematode associated with pulmonary migration and intestinal obstruction in heavy infection.",
  },
  "strongyloides-stercoralis": {
    abbreviations: [],
    commonNames: ["Strongyloides"],
    classificationTags: ["Parasite", "Helminth", "Nematode"],
    notes:
      "Autoinfecting nematode that can cause disseminated hyperinfection in immunosuppressed patients.",
  },
  "taenia-solium": {
    abbreviations: [],
    commonNames: ["Pork tapeworm"],
    classificationTags: ["Parasite", "Helminth", "Cestode"],
    notes:
      "Tapeworm associated with taeniasis and neurocysticercosis after ingestion of eggs.",
  },
  "candida-albicans": {
    abbreviations: ["C. albicans"],
    commonNames: ["Thrush yeast"],
    classificationTags: ["Fungus", "Yeast"],
    notes:
      "Opportunistic yeast that causes thrush, esophagitis, vulvovaginitis, and invasive candidemia in high-risk hosts.",
  },
  "candida-glabrata": {
    abbreviations: ["C. glabrata"],
    commonNames: [],
    classificationTags: ["Fungus", "Yeast"],
    notes:
      "Yeast associated with candiduria and invasive candidiasis, often with reduced azole susceptibility.",
  },
  "candida-auris": {
    abbreviations: ["C. auris"],
    commonNames: [],
    classificationTags: ["Fungus", "Yeast"],
    notes:
      "Multidrug-resistant yeast that spreads in healthcare settings and can cause invasive bloodstream infection.",
  },
  "aspergillus-fumigatus": {
    abbreviations: ["A. fumigatus"],
    commonNames: ["Aspergillus"],
    classificationTags: ["Fungus", "Mold"],
    notes:
      "Septate mold with acute-angle branching hyphae that causes allergic disease, aspergilloma, and invasive pulmonary infection.",
  },
  "cryptococcus-neoformans": {
    abbreviations: ["C. neoformans"],
    commonNames: ["Cryptococcus"],
    classificationTags: ["Fungus", "Yeast"],
    notes:
      "Encapsulated yeast associated with meningitis and pulmonary disease, especially in advanced immunosuppression.",
  },
  "histoplasma-capsulatum": {
    abbreviations: ["H. capsulatum"],
    commonNames: ["Histoplasma"],
    classificationTags: ["Fungus", "Dimorphic fungus"],
    notes:
      "Dimorphic fungus classically linked to bat or bird droppings and granulomatous pulmonary or disseminated disease.",
  },
  "blastomyces-dermatitidis": {
    abbreviations: ["B. dermatitidis"],
    commonNames: ["Blastomyces"],
    classificationTags: ["Fungus", "Dimorphic fungus"],
    notes:
      "Dimorphic fungus causing pulmonary infection with potential skin, bone, and genitourinary dissemination.",
  },
  "coccidioides-species": {
    abbreviations: [],
    commonNames: ["Coccidioides", "Valley fever fungus"],
    classificationTags: ["Fungus", "Dimorphic fungus"],
    notes:
      "Dimorphic fungus acquired by inhaling arthroconidia, ranging from self-limited pulmonary illness to meningitis or dissemination.",
  },
  "pneumocystis-jirovecii": {
    abbreviations: ["P. jirovecii", "PJP", "PCP"],
    commonNames: ["Pneumocystis"],
    classificationTags: ["Fungus", "Yeast-like fungus"],
    notes:
      "Opportunistic fungus that causes diffuse interstitial pneumonia in patients with impaired cellular immunity.",
  },
  "sporothrix-schenckii": {
    abbreviations: ["S. schenckii"],
    commonNames: ["Sporothrix"],
    classificationTags: ["Fungus", "Dimorphic fungus"],
    notes:
      "Dimorphic fungus inoculated through skin, classically causing nodular lymphangitic spread after plant or soil exposure.",
  },
  "malassezia-furfur": {
    abbreviations: ["M. furfur"],
    commonNames: ["Malassezia"],
    classificationTags: ["Fungus", "Yeast"],
    notes:
      "Lipophilic yeast associated with tinea versicolor and catheter-related fungemia in patients receiving lipid-rich infusions.",
  },
  "rhizopus-species": {
    abbreviations: [],
    commonNames: ["Rhizopus", "Mucor", "Mucorales"],
    classificationTags: ["Fungus", "Mold"],
    notes:
      "Broad nonseptate mold causing angioinvasive mucormycosis, especially in diabetic ketoacidosis and profound immunosuppression.",
  },
  "trichophyton-rubrum": {
    abbreviations: ["T. rubrum"],
    commonNames: ["Trichophyton"],
    classificationTags: ["Fungus", "Dermatophyte"],
    notes:
      "Dermatophyte that commonly causes tinea pedis, tinea corporis, and onychomycosis.",
  },
  "microsporum-canis": {
    abbreviations: ["M. canis"],
    commonNames: ["Microsporum"],
    classificationTags: ["Fungus", "Dermatophyte"],
    notes:
      "Zoophilic dermatophyte associated with inflammatory tinea corporis or tinea capitis after animal exposure.",
  },
  "epidermophyton-floccosum": {
    abbreviations: ["E. floccosum"],
    commonNames: ["Epidermophyton"],
    classificationTags: ["Fungus", "Dermatophyte"],
    notes:
      "Dermatophyte that infects skin and nails, especially in tinea cruris and tinea pedis.",
  },
  "talaromyces-marneffei": {
    abbreviations: ["T. marneffei"],
    commonNames: ["Penicillium marneffei"],
    classificationTags: ["Fungus", "Dimorphic fungus"],
    notes:
      "Dimorphic opportunistic fungus causing disseminated infection in advanced HIV, especially in Southeast Asia.",
  },
};

function inferGenusSpecies(entry: PathogenCatalogEntry): Pick<Organism, "genus" | "species"> {
  const parts = entry.canonical.split(/\s+/).filter(Boolean);
  if (parts.length !== 2) {
    return {};
  }

  const [genus, species] = parts;
  if (species.toLowerCase() === "virus" || species.toLowerCase() === "species") {
    return {};
  }

  return { genus, species };
}

function buildClassificationTags(entry: PathogenCatalogEntry): string[] {
  switch (entry.group) {
    case "virus_dna":
      return ["Virus", "DNA virus"];
    case "virus_rna":
      return ["Virus", "RNA virus"];
    case "parasite_protozoa":
      return ["Parasite", "Protozoan"];
    case "parasite_helminth":
      return ["Parasite", "Helminth"];
    case "parasite_ectoparasite":
      return ["Parasite", "Ectoparasite"];
    case "fungus_yeast":
      return ["Fungus", "Yeast"];
    case "fungus_mold":
      return ["Fungus", "Mold"];
    case "fungus_dimorphic":
      return ["Fungus", "Dimorphic fungus"];
    case "fungus_dermatophyte":
      return ["Fungus", "Dermatophyte"];
    case "bacteria_gram_positive":
      return ["Bacterium", "Gram-positive"];
    case "bacteria_gram_negative":
      return ["Bacterium", "Gram-negative"];
    default:
      return ["Bacterium", "Atypical"];
  }
}

function buildDerivedPathogen(entry: PathogenCatalogEntry): Organism {
  const overrides = ORGANISM_ALIAS_OVERRIDES[entry.id];
  return {
    id: entry.id,
    canonical: entry.canonical,
    kind: entry.kind,
    ...inferGenusSpecies(entry),
    abbreviations: overrides?.abbreviations ?? [],
    commonNames: overrides?.commonNames ?? [],
    classificationTags: overrides?.classificationTags ?? buildClassificationTags(entry),
    notes:
      overrides?.notes ??
      `${entry.canonical} is included in the expanded ${entry.kind} catalog for gameplay coverage.`,
  };
}

const EXISTING_IDS = new Set(CORE_BACTERIAL_ORGANISMS.map((organism) => organism.id));

const DERIVED_NON_BACTERIAL_PATHOGENS: Organism[] = PATHOGEN_CATALOG.filter(
  (entry) => !EXISTING_IDS.has(entry.id)
).map(buildDerivedPathogen);

/**
 * Canonical playable pathogen dictionary — bacteria plus derived virus and parasite
 * entries from the broader catalog.
 */
export const ORGANISMS: Organism[] = [
  ...CORE_BACTERIAL_ORGANISMS,
  ...DERIVED_NON_BACTERIAL_PATHOGENS,
];

/** Build an id → Organism lookup map for O(1) access. */
export const ORGANISM_MAP: Map<string, Organism> = new Map(
  ORGANISMS.map((o) => [o.id, o])
);

/** Lookup by canonical name (case-insensitive). */
export function getOrganismByCanonical(name: string): Organism | undefined {
  const normalized = name.toLowerCase().trim();
  return ORGANISMS.find((o) => o.canonical.toLowerCase() === normalized);
}
