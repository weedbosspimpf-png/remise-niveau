# @edu-restart/api

API Fastify + Prisma/PostgreSQL de EDU RESTART.

## Développement local

```bash
cp .env.example .env   # adapter DATABASE_URL si besoin
pnpm --filter @edu-restart/api run prisma:migrate   # crée/applique les migrations
pnpm --filter @edu-restart/api run prisma:seed      # seed du référentiel pilote (Côte d'Ivoire, 6e, Mathématiques)
pnpm --filter @edu-restart/api run dev              # démarre l'API en local
```

Le seed (`prisma/seed.ts`) insère un référentiel minimal de développement — **pas
un programme officiel réel**. Il sert uniquement à faire fonctionner un
diagnostic de bout en bout pendant le développement.
