import { renderComponent } from '@glimmerx/core';
import SimpleComponent from './SimpleComponent';

const containerElement = document.getElementById('app');

renderComponent(SimpleComponent, containerElement);
