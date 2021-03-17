import Component, { hbs, tracked } from '@glimmerx/component';
import { on, action } from '@glimmerx/modifier';

import './Carousel.css';

function getInitialWidth(el, fn) {
  fn(el.clientWidth);
}

class CarouselItem extends Component {
  static template = hbs`
    <div class="carousel-item">
      {{yield}}
    </div>
  `;
}

class CarouselContainer extends Component {
  @tracked _slideOffset = 0;
  @tracked _currentSlideIndex = 0;
  static template = hbs`
    <div class="carousel" ...attributes>
      <h3 class="carousel__title">{{@title}}</h3>
      <div class="carousel__navigation">
        <button class="carousel__button" {{on "click" this.prev}} disabled={{this.isAtStart}}>&lt; Prev</button>
        <button class="carousel__button" {{on "click" this.next}} disabled={{this.isAtEnd}}>Next &gt;</button>
      </div>
      <div class="carousel__content-wrapper" {{getInitialWidth this.setInitialWidth}}>
        <div class="carousel__content" style="transform: translateX(-{{this.slideOffset}}px)">
          {{#each @items as |item|}}
            {{yield (component CarouselItem) item}}
          {{/each}}
        </div>
      </div>
    </div>
  `;

  get isAtStart() {
    return this.currentSlideIndex === 0;
  }

  get isAtEnd() {
    return this.currentSlideIndex === this.args.items.length - 1;
  }

  get currentSlideIndex() {
    return this._currentSlideIndex;
  }

  set currentSlideIndex(newValue) {
    if (newValue < 0) {
      newValue = 0;
    } else if (newValue >= this.args.items.length) {
      newValue = this.args.items.length - 1;
    }
    this._currentSlideIndex = newValue;
  }

  get slideOffset() {
    return this._slideOffset;
  }

  set slideOffset(newValue) {
    if (newValue < 0) {
      newValue = 0;
    } else if (newValue > this.maxOffset) {
      newValue = this.maxOffset;
    }
    this._slideOffset = newValue;
  }

  @action
  setInitialWidth(width) {
    this.width = width;
    this.cardsPerPage = Math.floor(this.width / this.args.cardWidth);
    this.maxOffset = (this.args.items.length - 1) * this.args.cardWidth;
  }

  @action
  next() {
    this.slideOffset += this.args.cardWidth * this.cardsPerPage;
    this.currentSlideIndex += this.cardsPerPage;
  }

  @action
  prev() {
    this.slideOffset -= this.args.cardWidth * this.cardsPerPage;
    this.currentSlideIndex -= this.cardsPerPage;
  }
}

export default class Carousel extends Component {
  cardWidth = 250;

  static template = hbs`
    <CarouselContainer class="my-carousel" @cardWidth={{this.cardWidth}} @title={{@title}} @items={{this.items}} as |ItemComponent url|>
      <ItemComponent>
        <img src={{url}}>
      </ItemComponent>
    </CarouselContainer>
  `;

  get items() {
    const items = Array(10)
      .fill(`https://picsum.photos/${this.cardWidth}`)
      .map((url, index) => {
        return `${url}?random=${index}`;
      });
    return items;
  }
}
