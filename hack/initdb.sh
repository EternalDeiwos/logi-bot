#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" <<-EOSQL
	create schema "${POSTGRES_SCHEMA}";
	alter schema "${POSTGRES_SCHEMA}" owner to ${POSTGRES_USER};
	create extension "vector" with schema public;
	create extension "uuidv7-sql" with schema public;
	create extension "uuid-ossp";
EOSQL
