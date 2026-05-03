// Single source of truth for the wedding site.
// Edit ONLY this file to update content — no other file needs to change.

export const config = {
  couple: {
    bride: "Eugénia Duarte",
    groom: "João Barreto",
  },

  // ISO 8601 with timezone. Portugal: WEST (+01:00) summer, WET (+00:00) winter.
  // 3 Oct 2026 is still summer time (DST ends last Sunday of October), so +01:00.
  date: "2026-10-03T13:00:00+01:00",
  // Explicit end timestamp for the .ics DTEND. 23:00 — host's preferred end.
  endDate: "2026-10-03T23:00:00+01:00",

  // Last day guests can RSVP. After this date the form is replaced with a closed message.
  rsvpDeadline: "2026-08-01",

  ceremony: {
    name: "Capela de Nossa Senhora do Mar",
    address: "Zambujeira do Mar",
    photo: "/assets/chapel.png?v=2",
    lat: 0, // TODO: pin from Google Maps for sharper map deep-links
    lng: 0,
  },

  reception: {
    name: "Bar da Praia",
    address: "Almograve",
    lat: 0, // TODO: pin from Google Maps
    lng: 0,
  },

  dressCode: {
    title: "Casual chique",
    description: "Bonito, mas pronto para dançar.",
  },

  // Each entry becomes a card in the "Onde ficar" section.
  hotels: [
    // {
    //   name: "Hotel Exemplo",
    //   distance: "5 min de carro",
    //   priceRange: "€€",
    //   url: "https://...",
    //   photo: "/assets/photos/hotel-1.jpg",
    // },
  ],

  honeymoon: {
    image: {
      src: "/assets/japan.png",
      alt: "Ilustração de um templo no Japão",
    },
    description:
      "Em vez de presentes tradicionais, queremos guardar memórias. Estamos a juntar para a nossa lua-de-mel no Japão e qualquer contributo será recebido com muito carinho.",
    bankTransfer: {
      label: "NIF",
      value: "PLACEHOLDER_NIF",
    },
  },

  // Photos for the final carousel section.
  // Put images in /assets/carosel photos/ and list them here.
  gallery: [
    "/assets/carosel photos/01.jpeg",
    "/assets/carosel photos/02.jpeg",
    "/assets/carosel photos/03.jpeg",
    "/assets/carosel photos/04.jpeg",
    "/assets/carosel photos/05.jpeg",
    "/assets/carosel photos/06.jpeg",
    "/assets/carosel photos/07.jpeg",
    "/assets/carosel photos/08.jpeg",
    "/assets/carosel photos/09.jpeg",
    "/assets/carosel photos/10.jpeg",
    "/assets/carosel photos/11.jpeg",
    "/assets/carosel photos/12.jpeg",
  ],

  importantInfo: [
    {
      q: "Onde posso estacionar?",
      a: "Há lugares perto da capela e um estacionamento maior na Avenida do Mar, a poucos minutos a pé.",
    },
    {
      q: "A que horas começa e acaba?",
      a: "A cerimónia começa às 13:00. A receção segue depois, no Bar da Praia em Almograve, e acaba quando acabar.",
    },
    {
      q: "Devo levar casaco?",
      a: "Sim. À noite pode ficar frio, por isso traz um casaco.",
    },
    {
      q: "Que calçado devo levar?",
      a: "O calçado é normal, mas traz sapatos confortáveis para dançar.",
    },
    {
      q: "E se chover?",
      a: "Se chover, podemos ter de mudar os planos à última hora.",
    },
  ],

  footer: {
    text: "Vemo-nos lá — Jena e João",
  },

  // Google Apps Script web-app URL (deployed from a Google Sheet — see README).
  rsvpEndpoint: "PLACEHOLDER_GOOGLE_APPS_SCRIPT_URL",
};
