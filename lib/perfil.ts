// Fuente única de los datos del perfil de Pablo.
// Lo que es idéntico en /cv y en todas las landings de /home vive aquí.
// Lo que cada vista reescribe a su estilo (experiencia, aptitudes, niveles
// de idioma) se queda en cada página: no es duplicación, es diseño.

export type Recomendacion = {
  quote: string;
  author: string;
  role: string;       // cargo / título profesional
  relation: string;   // relación con Pablo — solo lo muestra /cv
  date: string;       // fecha de la recomendación — solo lo muestra /cv
  photo: string;
  url: string;
};

export type Certificacion = { label: string; issuer: string; year: string };

// `org` (texto combinado que muestran cv/editorial/dark/timeline/manifesto) se
// deriva de issuer + note — original/neon los muestran por separado.
export type Premio = { title: string; issuer: string; note: string; date: string };

export const RECOMENDACIONES: Recomendacion[] = [
  { quote: "I had the privilege of working with Pablo, a dynamic and proactive colleague. Pablo is a hands-on problem solver, consistently driving solutions and fostering collaboration across departments. His exceptional interpersonal skills create a positive work environment. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges seamlessly.", author: "Kerem Kocak", role: "Head of Product · ex-OLX, CAFU, Turkcell", relation: "managed Pablo directly", date: "mar 2023", photo: "/recomendadores/kerem.jpg", url: "https://www.linkedin.com/in/kerem-product/" },
  { quote: "Pablo and I worked together on letgo. I must say he is one of the best product managers I have worked with. His communication and prioritization skills, help team going forward a lot faster. He takes ownership on initiatives and delivers valuable outcomes. Besides, he is very fun to work with. I believe he will be a great addition to any team.", author: "Yeliz Ustabas Lopez", role: "Risk and Fraud · Sr. Product Manager at Eventbrite", relation: "worked with Pablo on the same team", date: "oct 2021", photo: "/recomendadores/yeliz.jpg", url: "https://www.linkedin.com/in/yeliz-ustabas/" },
  { quote: "I've had the pleasure of working closely with Pablo for several years, and I can confidently say that he is an exceptional professional. Pablo possesses a unique skill set that makes him a valuable asset to any team. I want to highlight his exceptional ability to solve complex problems and find practical solutions, as well as his remarkable adaptability when taking on new assignments. Above all, what sets Pablo apart is his positive attitude and friendly demeanor, which not only make working with him enjoyable but also foster a collaborative and welcoming work environment.", author: "David Adalid", role: "QA Specialist · ISTQB Certified", relation: "worked with Pablo on the same team", date: "may 2022", photo: "/recomendadores/david.jpg", url: "https://www.linkedin.com/in/david-adalid/" },
  { quote: "Pablo is a high-skilled one-man band. He is able to perform so many different roles but, at the same time, able to lead by example a group of ICs so they go the extra mile. He is easy-going, happy to negotiate and to reach agreements. He is not pure-techie, but you can throw him any kind of ball and he will be ready for it. I'd say of Pablo that he is one of a kind and I'd be delighted to work with him again.", author: "Jesús Rodríguez", role: "Agile Facilitator / People Developer", relation: "worked with Pablo on the same team", date: "ago 2020", photo: "/recomendadores/jesus.jpg", url: "https://www.linkedin.com/in/jesusrh/" },
  { quote: "I had the privilege of working with Pablo for several years at the hyper-fast-growing startup letgo. Pablo is not only incredibly smart but also exceptionally hardworking. He's the kind of guy who's there to get the job done, no matter the challenge. ANY, really! Throw him a challenge and he will solve it. His fantastic sense of humor and positive attitude also make working with him a breeze.", author: "Adrià Vallès", role: "Engineering Manager · Lingokids", relation: "worked with Pablo on different teams", date: "jun 2022", photo: "/recomendadores/adria.jpg", url: "https://www.linkedin.com/in/adriavalles/" },
  { quote: "Pablo showed unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions. Guided by Pablo's leadership, the team has had great business impact using complex technical initiatives like Home personalization and Search relevance. I have learned a lot from Pablo during this period, especially from his ability to quickly adapt to business changes.", author: "Julien Meynet", role: "AI/ML Leader · Search & Recommender Systems · PhD", relation: "worked with Pablo on different teams", date: "feb 2023", photo: "/recomendadores/julien.jpg", url: "https://www.linkedin.com/in/julienmeynet/" },
  { quote: "You need something done and you need it quick... but you also need to align many stakeholders, while understanding the customers' pains and keeping in mind the technical limitations... Then Pablo is your man! He gets things done. He gets features shipped. And all while keeping a smile on... I miss working with him!", author: "Arnau Tibau Puig", role: "Data & AI for climate · PhD", relation: "worked with Pablo on the same team", date: "nov 2021", photo: "/recomendadores/arnau.jpg", url: "https://www.linkedin.com/in/atibaup/" },
  { quote: "Es un honor recomendar a Pablo, una mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas. Su curiosidad insaciable, proactividad y enfoque implacable en los objetivos hacen que sea un compañero excepcional. Gran líder y mentor, destaco su disposición constante para compartir conocimientos y desafiar ideas para encontrar las mejores soluciones.", author: "Janna Ubach", role: "Trust & Safety PM · N26 · ex-TikTok, ex-OLX", relation: "worked with Pablo on the same team", date: "sep 2022", photo: "/recomendadores/janna.jpg", url: "https://www.linkedin.com/in/jannaubach/" },
  { quote: "Lo que más aprendí de Pablo es que siempre tenía actitud positiva, te daba mucha confianza y te ayudaba a tener todo bajo control. Otra de las virtudes de Pablo es que es muy multidisciplinar. Sin duda una de las cosas que más aprendí fue todo el tema de metodologías Agile, teníamos unas metodologías muy dinámicas en los procesos de trabajo.", author: "Dani Cruz", role: "AI Advertising", relation: "reported to Pablo", date: "mar 2019", photo: "/recomendadores/dani.jpg", url: "https://www.linkedin.com/in/danicruzpaidsocial/" },
  { quote: "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He considers all the possible outcomes and effects and will often think of issues in a solution that others will not. He's a great collaborator as well and will challenge you in your assumptions. He's also well versed technically and can get comfortably into the details with engineers.", author: "Mark Leung", role: "Principal Solution Strategist · Datavisor", relation: "Pablo was a client of mine", date: "dic 2022", photo: "/recomendadores/mark.jpg", url: "https://www.linkedin.com/in/mark-leung-8524105/" },
  { quote: "Pablo es una de las personas con las que mejor he trabajado. Su capacidad de comunicación es excepcional. Su organización es envidiable, siempre mantiene un enfoque claro y estructurado y sobretodo, muy pragmático. Lo que más me impresiona de Pablo es su adaptabilidad. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor y creando una atmósfera de colaboración y buen rollo como muy pocas personas son capaces de generar.", author: "Cristian Martin Mouat", role: "From tech strategy to hands-on development", relation: "worked with Pablo on the same team", date: "ene 2023", photo: "/recomendadores/cristian.jpg", url: "https://www.linkedin.com/in/cristian-martin-mouat/" },
  { quote: "I thoroughly enjoyed meeting and working with Pablo for two years. He is an energetic, upbeat person who always lightens up any room he enters. Pablo has an inquisitive mind and sharp intellect and is a versatile problem solver. He has successfully found external providers, managed business operations, written SQL queries, and led mid-sized multidisciplinary teams. If this sounds too good to be true, just hop on a call with him and see for yourself.", author: "Jordi Escrich", role: "Data Specialist", relation: "worked with Pablo on the same team", date: "jul 2021", photo: "/recomendadores/jordi.jpg", url: "https://www.linkedin.com/in/jordiescrich/" },
  { quote: "Pablo gets straight to the point, simplifies what is difficult and focuses on what is important. He makes the way easier for everyone to deliver the task while listening to all points of view. Nothing escapes him. As a designer I recommend Pablo 100%.", author: "Iván Bayo", role: "Designing impactful user experiences", relation: "worked with Pablo on the same team", date: "nov 2020", photo: "/recomendadores/ivan.jpg", url: "https://www.linkedin.com/in/ivanbayo/" },
  { quote: "Pablo is a great professional. His strong analytical skills make him ready and able to solve every problem he has to face. He is able to manage huge work-load and to perform perfectly in stressful situations always keeping a smile on his face. I am sure he would be the perfect element for every team!", author: "Daniela Servi", role: "ESL Teacher · SCUOLA INTERNAZIONALE DI PAVIA", relation: "worked with Pablo on the same team", date: "jun 2016", photo: "/recomendadores/daniela.jpg", url: "https://www.linkedin.com/in/danielaservi/" },
  { quote: "Pablo, es sin duda, una de las personas más inteligentes, trabajadoras y profesionales con las que he tenido el placer de trabajar. Además de gestionar la logística de Nonabox de forma soberbia, aplica sus conocimientos de forma práctica y antepone lo que juzga es mejor para la empresa. Siempre he intentado tener en cuenta su opinión para cualquier desarrollo, pues sabe abstraerse y pensar siempre de la forma correcta.", author: "Mario Pérez Pereira", role: "Head of Product", relation: "managed Pablo directly", date: "mar 2015", photo: "/recomendadores/mario.jpg", url: "https://www.linkedin.com/in/marioperezpereira/" },
];

export const CERTIFICACIONES: Certificacion[] = [
  { label: "Product Executive Certificate", issuer: "Product School", year: "nov. 2021" },
  { label: "Certified Scrum Product Owner", issuer: "Agilar Spain", year: "may. 2017" },
  { label: "Certified Scrum Master", issuer: "Agilar Spain", year: "abr. 2017" },
  { label: "Retention + Engagement Deep Dive", issuer: "Reforge", year: "nov. 2018" },
  { label: "Certified Mentor", issuer: "Mentorloop", year: "abr. 2022" },
  { label: "Diplôme d'Études en Langue Française", issuer: "Ministère de l'Éducation nationale", year: "jul. 2002" },
  { label: "First Certificate Exam", issuer: "University of Cambridge", year: "jun. 2002" },
  { label: "Advanced Open Water Diver", issuer: "PADI", year: "ago. 2009" },
];

export const PREMIOS: Premio[] = [
  { title: "Best Startup Products & Services. Early Stage", issuer: "Spain Startup & Investor Summit", note: "Nonabox", date: "oct. 2013" },
  { title: "Finalista StartCamp Madrid 2013", issuer: "Wayra — Telefónica", note: "Proyecto iVecinos", date: "mar. 2013" },
  { title: "Tercer puesto campeonato nacional de capoeira", issuer: "", note: "", date: "may. 2009" },
  { title: "Primer puesto campeonato local de ajedrez", issuer: "", note: "", date: "jun. 1995" },
];

/** `org` combinado, como lo muestran la mayoría de vistas. */
export const premioOrg = (p: Premio): string => [p.issuer, p.note].filter(Boolean).join(" · ");
