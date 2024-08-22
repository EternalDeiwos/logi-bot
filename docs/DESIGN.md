# Logi Bot

> TODO Description

## Supabase

> TODO

## NestJS and Necord

JavaScript and TypeScript are well-known languages that decrease the barrier to entry for contributors to interact with a project. These are also a familiar syntax that can be used across all manner of projects, including: browser web applications (i.e. Frontend), services and APIs, 3D (e.g. games), various utilities and scripting tools, and others. Despite flaws and sub-optimal performance, we choose to focus on developer access and experience.

A critical part lacking from a typical `express` application is the kind of structure provided by application frameworks such as Java Spring, Quarkus (Java), or .NET Core (C#). The lack of structure in a basic NodeJS application makes maintaining the application inaccessible to anyone not already intimately familiar with the individual structure and style of the authors. Simply put, it is extremely difficult to intuit how components relate to one another. Using the NestJS application framework attempts to address this shortcoming.

NestJS is an application framework for NodeJS that provides similar syntax and structure to NodeJS applications that Spring or Quarkus do to Java applications, including modularity, management of dependencies and dependency injection, and an opinionated, predictable application structure. NestJS enables and encourages SOLID design in TypeScript, without resorting to abusing its lax syntax rules and making the application more difficult to maintain.

Necord is a NestJS-compatible wrapper around the popular Discord.JS library. This lets us use familiar NestJS patterns to define interactions for our discord bot.

## RabbitMQ

One missing component from Discord's event notifications is reliable handling of events, specifically:

- Events are only delivered under ideal conditions:
  1. Iff there is a client registered to receive them, and
  1. Iff there are no failures in Discord's backend, in the client application, or in the transport between them.
- There is no means to retry an event, or acknowledge when an event is handled correctly.
- There is no way to see or replay past events, only the current application state can be queried.

For events which are never delivered to client applications, there is nothing we can do to correct this and instead the application should be built with the assumption that some events may be missing. Discord does not guarantee delivery of every event, and does not tolerate any faults otherwise, both on our side or theirs. For this application it means that discord related state should always have some way to be corrected by users, or trigger targeted state reconciliation that queries the discord API directly. This discussed elsewhere.

The remainder can be addressed using RabbitMQ. It is worth noting that queueing events through RabbitMQ adds additional overhead effort because the Discord event needs to be handled, and then each resulting RabbitMQ event needs to be handled. Additionally, RabbitMQ is an external application that requires infrastructure and maintenance to run. Despite the additional cost, the effort is worth it because the maintenance of the additional code required to achieve the same functionality would exceed the cost of deploying and maintaining well-known software such as RabbitMQ in a minimal configuration.

RabbitMQ also includes built-in retry, timeouts, and acknowledgements. Events can be delivered with the expectation of a future acknowledgement. If the acknowledgement does not come before the timeout elapses then the same event will be delivered again however many times the event is configured to be retried. This is useful to guard against failures in discord's API. Retries can be staggered with exponential backoff and these features are all configurable, native features of RabbitMQ that require no development overhead aside from consideration in handling.

RabbitMQ can configure _dead letter routing_, where if an event cannot be delivered or completion is not acknowledged — and there are no retries remaining — then the message can be routed to a different queue for recovery and/or archival. While this requires consideration and creation of a dead letter handler to archive and notify of failed events, this is beneficial for detecting and logging errors, and discovering bugs in the application. Failed events can be reviewed and replayed manually if appropriate after a fix is implemented to ensure the consistency of the application.
