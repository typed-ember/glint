import Application from 'ts-ember-app/app';
import config from 'ts-ember-app/config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';

setApplication(Application.create(config.APP));

start();
