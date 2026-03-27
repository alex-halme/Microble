/**
 * Broad pathogen catalog for planned Microble expansion.
 *
 * This file is intentionally separate from lib/organisms.ts.
 * The current Organism schema is bacteria-oriented (gram stain, morphology, oxygen),
 * so viruses, parasites, and fungi need a broader catalog model before they can be wired into
 * gameplay, answer matching, and case generation.
 *
 * Source basis used to refine this list:
 * - Public USMLE-oriented playlists/indexes from Pixorize for bacteria, viruses, parasites, and fungi
 * - CDC parasite and vector-borne disease indexes for cross-checking major human pathogens
 * - NCBI Bookshelf Medical Microbiology for broad pathogen framing
 *
 * This is an editorial target list, not an official USMLE publication.
 */

export type PathogenKind = "bacterium" | "virus" | "parasite" | "fungus";
export type PathogenTier = "usmle_core" | "usmle_extended" | "rare_bonus";
export type PathogenGroup =
  | "bacteria_gram_positive"
  | "bacteria_gram_negative"
  | "bacteria_atypical"
  | "virus_dna"
  | "virus_rna"
  | "parasite_protozoa"
  | "parasite_helminth"
  | "parasite_ectoparasite"
  | "fungus_yeast"
  | "fungus_mold"
  | "fungus_dimorphic"
  | "fungus_dermatophyte";

export interface PathogenCatalogEntry {
  id: string;
  canonical: string;
  kind: PathogenKind;
  tier: PathogenTier;
  group: PathogenGroup;
  dailyEligible: boolean;
}

export const PATHOGEN_CATALOG: PathogenCatalogEntry[] = [
  // Bacteria: gram-positive / acid-fast / atypical gram-positive
  { id: "staphylococcus-aureus", canonical: "Staphylococcus aureus", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "staphylococcus-epidermidis", canonical: "Staphylococcus epidermidis", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "staphylococcus-saprophyticus", canonical: "Staphylococcus saprophyticus", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "streptococcus-pneumoniae", canonical: "Streptococcus pneumoniae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "viridans-streptococci", canonical: "Viridans streptococci", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "streptococcus-pyogenes", canonical: "Streptococcus pyogenes", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "streptococcus-agalactiae", canonical: "Streptococcus agalactiae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "streptococcus-gallolyticus", canonical: "Streptococcus gallolyticus", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "enterococcus-faecalis", canonical: "Enterococcus faecalis", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "enterococcus-faecium", canonical: "Enterococcus faecium", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "bacillus-anthracis", canonical: "Bacillus anthracis", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "bacillus-cereus", canonical: "Bacillus cereus", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "clostridium-tetani", canonical: "Clostridium tetani", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "clostridium-perfringens", canonical: "Clostridium perfringens", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "clostridium-botulinum", canonical: "Clostridium botulinum", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "clostridioides-difficile", canonical: "Clostridioides difficile", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "corynebacterium-diphtheriae", canonical: "Corynebacterium diphtheriae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "listeria-monocytogenes", canonical: "Listeria monocytogenes", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "nocardia-asteroides", canonical: "Nocardia asteroides", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "actinomyces-israelii", canonical: "Actinomyces israelii", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_positive", dailyEligible: true },
  { id: "mycobacterium-tuberculosis", canonical: "Mycobacterium tuberculosis", kind: "bacterium", tier: "usmle_core", group: "bacteria_atypical", dailyEligible: true },
  { id: "mycobacterium-avium-complex", canonical: "Mycobacterium avium complex", kind: "bacterium", tier: "usmle_extended", group: "bacteria_atypical", dailyEligible: true },
  { id: "mycobacterium-scrofulaceum", canonical: "Mycobacterium scrofulaceum", kind: "bacterium", tier: "rare_bonus", group: "bacteria_atypical", dailyEligible: true },
  { id: "mycobacterium-leprae", canonical: "Mycobacterium leprae", kind: "bacterium", tier: "usmle_core", group: "bacteria_atypical", dailyEligible: true },
  { id: "mycoplasma-pneumoniae", canonical: "Mycoplasma pneumoniae", kind: "bacterium", tier: "usmle_core", group: "bacteria_atypical", dailyEligible: true },
  { id: "gardnerella-vaginalis", canonical: "Gardnerella vaginalis", kind: "bacterium", tier: "usmle_extended", group: "bacteria_atypical", dailyEligible: true },

  // Bacteria: gram-negative / spirochetes / intracellulars
  { id: "neisseria-gonorrhoeae", canonical: "Neisseria gonorrhoeae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "neisseria-meningitidis", canonical: "Neisseria meningitidis", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "haemophilus-influenzae", canonical: "Haemophilus influenzae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "bordetella-pertussis", canonical: "Bordetella pertussis", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "brucella-species", canonical: "Brucella species", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "legionella-pneumophila", canonical: "Legionella pneumophila", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "pseudomonas-aeruginosa", canonical: "Pseudomonas aeruginosa", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "salmonella-typhi", canonical: "Salmonella Typhi", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "nontyphoidal-salmonella", canonical: "Non-typhoidal Salmonella", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "shigella-species", canonical: "Shigella species", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "yersinia-enterocolitica", canonical: "Yersinia enterocolitica", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "yersinia-pestis", canonical: "Yersinia pestis", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "escherichia-coli", canonical: "Escherichia coli", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "enterohemorrhagic-escherichia-coli", canonical: "Enterohemorrhagic Escherichia coli", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "enterotoxigenic-escherichia-coli", canonical: "Enterotoxigenic Escherichia coli", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "klebsiella-pneumoniae", canonical: "Klebsiella pneumoniae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "proteus-mirabilis", canonical: "Proteus mirabilis", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "serratia-marcescens", canonical: "Serratia marcescens", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "campylobacter-jejuni", canonical: "Campylobacter jejuni", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "vibrio-cholerae", canonical: "Vibrio cholerae", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "vibrio-vulnificus", canonical: "Vibrio vulnificus", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "helicobacter-pylori", canonical: "Helicobacter pylori", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "bacteroides-fragilis", canonical: "Bacteroides fragilis", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "francisella-tularensis", canonical: "Francisella tularensis", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "pasteurella-multocida", canonical: "Pasteurella multocida", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "bartonella-henselae", canonical: "Bartonella henselae", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "bartonella-quintana", canonical: "Bartonella quintana", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "treponema-pallidum", canonical: "Treponema pallidum", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "borrelia-burgdorferi", canonical: "Borrelia burgdorferi", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "leptospira-interrogans", canonical: "Leptospira interrogans", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "chlamydia-trachomatis", canonical: "Chlamydia trachomatis", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "chlamydophila-pneumoniae", canonical: "Chlamydophila pneumoniae", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "chlamydophila-psittaci", canonical: "Chlamydophila psittaci", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "rickettsia-rickettsii", canonical: "Rickettsia rickettsii", kind: "bacterium", tier: "usmle_core", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "rickettsia-prowazekii", canonical: "Rickettsia prowazekii", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "rickettsia-typhi", canonical: "Rickettsia typhi", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "coxiella-burnetii", canonical: "Coxiella burnetii", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "anaplasma-phagocytophilum", canonical: "Anaplasma phagocytophilum", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "ehrlichia-chaffeensis", canonical: "Ehrlichia chaffeensis", kind: "bacterium", tier: "usmle_extended", group: "bacteria_gram_negative", dailyEligible: true },

  // Bacteria: rarer bonuses for the free-play pool
  { id: "acinetobacter-baumannii", canonical: "Acinetobacter baumannii", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "stenotrophomonas-maltophilia", canonical: "Stenotrophomonas maltophilia", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "burkholderia-pseudomallei", canonical: "Burkholderia pseudomallei", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "burkholderia-cepacia", canonical: "Burkholderia cepacia", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "fusobacterium-necrophorum", canonical: "Fusobacterium necrophorum", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },
  { id: "aeromonas-hydrophila", canonical: "Aeromonas hydrophila", kind: "bacterium", tier: "rare_bonus", group: "bacteria_gram_negative", dailyEligible: true },

  // Viruses: DNA
  { id: "herpes-simplex-virus-1", canonical: "Herpes simplex virus 1", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "herpes-simplex-virus-2", canonical: "Herpes simplex virus 2", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "varicella-zoster-virus", canonical: "Varicella-zoster virus", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "epstein-barr-virus", canonical: "Epstein-Barr virus", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "cytomegalovirus", canonical: "Cytomegalovirus", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "human-herpesvirus-6", canonical: "Human herpesvirus 6", kind: "virus", tier: "usmle_extended", group: "virus_dna", dailyEligible: true },
  { id: "human-herpesvirus-8", canonical: "Human herpesvirus 8", kind: "virus", tier: "usmle_extended", group: "virus_dna", dailyEligible: true },
  { id: "molluscum-contagiosum-virus", canonical: "Molluscum contagiosum virus", kind: "virus", tier: "usmle_extended", group: "virus_dna", dailyEligible: true },
  { id: "variola-virus", canonical: "Variola virus", kind: "virus", tier: "usmle_extended", group: "virus_dna", dailyEligible: true },
  { id: "hepatitis-b-virus", canonical: "Hepatitis B virus", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "adenovirus", canonical: "Adenovirus", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "human-papillomavirus", canonical: "Human papillomavirus", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },
  { id: "jc-virus", canonical: "JC virus", kind: "virus", tier: "usmle_extended", group: "virus_dna", dailyEligible: true },
  { id: "bk-virus", canonical: "BK virus", kind: "virus", tier: "usmle_extended", group: "virus_dna", dailyEligible: true },
  { id: "parvovirus-b19", canonical: "Parvovirus B19", kind: "virus", tier: "usmle_core", group: "virus_dna", dailyEligible: true },

  // Viruses: RNA
  { id: "human-immunodeficiency-virus-1", canonical: "Human immunodeficiency virus 1", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "human-t-lymphotropic-virus-1", canonical: "Human T-lymphotropic virus 1", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "rotavirus", canonical: "Rotavirus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "poliovirus", canonical: "Poliovirus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "coxsackievirus", canonical: "Coxsackievirus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "echovirus", canonical: "Echovirus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "rhinovirus", canonical: "Rhinovirus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "hepatitis-a-virus", canonical: "Hepatitis A virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "hepatitis-e-virus", canonical: "Hepatitis E virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "norovirus", canonical: "Norovirus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "hepatitis-c-virus", canonical: "Hepatitis C virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "yellow-fever-virus", canonical: "Yellow fever virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "dengue-virus", canonical: "Dengue virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "west-nile-virus", canonical: "West Nile virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "st-louis-encephalitis-virus", canonical: "St. Louis encephalitis virus", kind: "virus", tier: "rare_bonus", group: "virus_rna", dailyEligible: true },
  { id: "zika-virus", canonical: "Zika virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "chikungunya-virus", canonical: "Chikungunya virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "rubella-virus", canonical: "Rubella virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "sars-cov-2", canonical: "SARS-CoV-2", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "influenza-a-virus", canonical: "Influenza A virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "influenza-b-virus", canonical: "Influenza B virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "respiratory-syncytial-virus", canonical: "Respiratory syncytial virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "parainfluenza-virus", canonical: "Parainfluenza virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "measles-virus", canonical: "Measles virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "mumps-virus", canonical: "Mumps virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "rabies-virus", canonical: "Rabies virus", kind: "virus", tier: "usmle_core", group: "virus_rna", dailyEligible: true },
  { id: "ebola-virus", canonical: "Ebola virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "marburg-virus", canonical: "Marburg virus", kind: "virus", tier: "rare_bonus", group: "virus_rna", dailyEligible: true },
  { id: "lassa-virus", canonical: "Lassa virus", kind: "virus", tier: "rare_bonus", group: "virus_rna", dailyEligible: true },
  { id: "lymphocytic-choriomeningitis-virus", canonical: "Lymphocytic choriomeningitis virus", kind: "virus", tier: "rare_bonus", group: "virus_rna", dailyEligible: true },
  { id: "hantavirus", canonical: "Hantavirus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },
  { id: "crimean-congo-hemorrhagic-fever-virus", canonical: "Crimean-Congo hemorrhagic fever virus", kind: "virus", tier: "rare_bonus", group: "virus_rna", dailyEligible: true },
  { id: "hepatitis-d-virus", canonical: "Hepatitis D virus", kind: "virus", tier: "usmle_extended", group: "virus_rna", dailyEligible: true },

  // Parasites: protozoa
  { id: "giardia-lamblia", canonical: "Giardia lamblia", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "toxoplasma-gondii", canonical: "Toxoplasma gondii", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "entamoeba-histolytica", canonical: "Entamoeba histolytica", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "cryptosporidium-species", canonical: "Cryptosporidium species", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "cyclospora-cayetanensis", canonical: "Cyclospora cayetanensis", kind: "parasite", tier: "usmle_extended", group: "parasite_protozoa", dailyEligible: true },
  { id: "cystoisospora-belli", canonical: "Cystoisospora belli", kind: "parasite", tier: "usmle_extended", group: "parasite_protozoa", dailyEligible: true },
  { id: "naegleria-fowleri", canonical: "Naegleria fowleri", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "acanthamoeba-species", canonical: "Acanthamoeba species", kind: "parasite", tier: "usmle_extended", group: "parasite_protozoa", dailyEligible: true },
  { id: "balantidium-coli", canonical: "Balantidium coli", kind: "parasite", tier: "rare_bonus", group: "parasite_protozoa", dailyEligible: true },
  { id: "trypanosoma-brucei", canonical: "Trypanosoma brucei", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "babesia-microti", canonical: "Babesia microti", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "trypanosoma-cruzi", canonical: "Trypanosoma cruzi", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "leishmania-species", canonical: "Leishmania species", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "trichomonas-vaginalis", canonical: "Trichomonas vaginalis", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "plasmodium-falciparum", canonical: "Plasmodium falciparum", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "plasmodium-vivax", canonical: "Plasmodium vivax", kind: "parasite", tier: "usmle_core", group: "parasite_protozoa", dailyEligible: true },
  { id: "plasmodium-ovale", canonical: "Plasmodium ovale", kind: "parasite", tier: "usmle_extended", group: "parasite_protozoa", dailyEligible: true },
  { id: "plasmodium-malariae", canonical: "Plasmodium malariae", kind: "parasite", tier: "usmle_extended", group: "parasite_protozoa", dailyEligible: true },
  { id: "plasmodium-knowlesi", canonical: "Plasmodium knowlesi", kind: "parasite", tier: "rare_bonus", group: "parasite_protozoa", dailyEligible: true },

  // Parasites: helminths
  { id: "enterobius-vermicularis", canonical: "Enterobius vermicularis", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "ascaris-lumbricoides", canonical: "Ascaris lumbricoides", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "strongyloides-stercoralis", canonical: "Strongyloides stercoralis", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "ancylostoma-duodenale", canonical: "Ancylostoma duodenale", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "necator-americanus", canonical: "Necator americanus", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "trichinella-spiralis", canonical: "Trichinella spiralis", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "trichuris-trichiura", canonical: "Trichuris trichiura", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "toxocara-canis", canonical: "Toxocara canis", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "onchocerca-volvulus", canonical: "Onchocerca volvulus", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "loa-loa", canonical: "Loa loa", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "wuchereria-bancrofti", canonical: "Wuchereria bancrofti", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "taenia-solium", canonical: "Taenia solium", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "taenia-saginata", canonical: "Taenia saginata", kind: "parasite", tier: "rare_bonus", group: "parasite_helminth", dailyEligible: true },
  { id: "diphyllobothrium-latum", canonical: "Diphyllobothrium latum", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "echinococcus-granulosus", canonical: "Echinococcus granulosus", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "schistosoma-haematobium", canonical: "Schistosoma haematobium", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "schistosoma-mansoni", canonical: "Schistosoma mansoni", kind: "parasite", tier: "usmle_core", group: "parasite_helminth", dailyEligible: true },
  { id: "schistosoma-japonicum", canonical: "Schistosoma japonicum", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "clonorchis-sinensis", canonical: "Clonorchis sinensis", kind: "parasite", tier: "usmle_extended", group: "parasite_helminth", dailyEligible: true },
  { id: "fasciola-hepatica", canonical: "Fasciola hepatica", kind: "parasite", tier: "rare_bonus", group: "parasite_helminth", dailyEligible: true },
  { id: "paragonimus-westermani", canonical: "Paragonimus westermani", kind: "parasite", tier: "rare_bonus", group: "parasite_helminth", dailyEligible: true },
  { id: "dracunculus-medinensis", canonical: "Dracunculus medinensis", kind: "parasite", tier: "rare_bonus", group: "parasite_helminth", dailyEligible: true },
  { id: "angiostrongylus-cantonensis", canonical: "Angiostrongylus cantonensis", kind: "parasite", tier: "rare_bonus", group: "parasite_helminth", dailyEligible: true },

  // Parasites: ectoparasites
  { id: "sarcoptes-scabiei", canonical: "Sarcoptes scabiei", kind: "parasite", tier: "usmle_core", group: "parasite_ectoparasite", dailyEligible: true },
  { id: "pediculus-humanus-corporis", canonical: "Pediculus humanus corporis", kind: "parasite", tier: "usmle_extended", group: "parasite_ectoparasite", dailyEligible: true },
  { id: "phthirus-pubis", canonical: "Phthirus pubis", kind: "parasite", tier: "usmle_extended", group: "parasite_ectoparasite", dailyEligible: true },

  // Fungi: core USMLE coverage plus important extras
  { id: "candida-albicans", canonical: "Candida albicans", kind: "fungus", tier: "usmle_core", group: "fungus_yeast", dailyEligible: true },
  { id: "aspergillus-fumigatus", canonical: "Aspergillus fumigatus", kind: "fungus", tier: "usmle_core", group: "fungus_mold", dailyEligible: true },
  { id: "cryptococcus-neoformans", canonical: "Cryptococcus neoformans", kind: "fungus", tier: "usmle_core", group: "fungus_yeast", dailyEligible: true },
  { id: "histoplasma-capsulatum", canonical: "Histoplasma capsulatum", kind: "fungus", tier: "usmle_core", group: "fungus_dimorphic", dailyEligible: true },
  { id: "blastomyces-dermatitidis", canonical: "Blastomyces dermatitidis", kind: "fungus", tier: "usmle_core", group: "fungus_dimorphic", dailyEligible: true },
  { id: "coccidioides-species", canonical: "Coccidioides species", kind: "fungus", tier: "usmle_core", group: "fungus_dimorphic", dailyEligible: true },
  { id: "pneumocystis-jirovecii", canonical: "Pneumocystis jirovecii", kind: "fungus", tier: "usmle_core", group: "fungus_yeast", dailyEligible: true },
  { id: "sporothrix-schenckii", canonical: "Sporothrix schenckii", kind: "fungus", tier: "usmle_core", group: "fungus_dimorphic", dailyEligible: true },
  { id: "malassezia-furfur", canonical: "Malassezia furfur", kind: "fungus", tier: "usmle_core", group: "fungus_yeast", dailyEligible: true },
  { id: "rhizopus-species", canonical: "Rhizopus species", kind: "fungus", tier: "usmle_core", group: "fungus_mold", dailyEligible: true },
  { id: "candida-glabrata", canonical: "Candida glabrata", kind: "fungus", tier: "usmle_extended", group: "fungus_yeast", dailyEligible: true },
  { id: "trichophyton-rubrum", canonical: "Trichophyton rubrum", kind: "fungus", tier: "usmle_extended", group: "fungus_dermatophyte", dailyEligible: true },
  { id: "microsporum-canis", canonical: "Microsporum canis", kind: "fungus", tier: "usmle_extended", group: "fungus_dermatophyte", dailyEligible: true },
  { id: "epidermophyton-floccosum", canonical: "Epidermophyton floccosum", kind: "fungus", tier: "usmle_extended", group: "fungus_dermatophyte", dailyEligible: true },
  { id: "candida-auris", canonical: "Candida auris", kind: "fungus", tier: "rare_bonus", group: "fungus_yeast", dailyEligible: true },
  { id: "talaromyces-marneffei", canonical: "Talaromyces marneffei", kind: "fungus", tier: "rare_bonus", group: "fungus_dimorphic", dailyEligible: true },
];

export const PATHOGEN_CATALOG_COUNTS = {
  total: PATHOGEN_CATALOG.length,
  bacteria: PATHOGEN_CATALOG.filter((entry) => entry.kind === "bacterium").length,
  viruses: PATHOGEN_CATALOG.filter((entry) => entry.kind === "virus").length,
  parasites: PATHOGEN_CATALOG.filter((entry) => entry.kind === "parasite").length,
  fungi: PATHOGEN_CATALOG.filter((entry) => entry.kind === "fungus").length,
  dailyEligible: PATHOGEN_CATALOG.filter((entry) => entry.dailyEligible).length,
};
