const _days = {
  'fr': ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'],
  'en': ['Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.'],
}

const _months = {
  'fr': ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const _horaire = {
  'fr': 'Horaire :',
  'en': 'Time:',
};
const _valider = {
  'fr': 'Valider',
  'en': 'Validate',
};

const formatDT_1 = /(?<day>\d{2})\/(?<month>\d{2})\/(?<year>\d{4}) (?<hour>\d{2}):(?<minutes>\d{2})(:\d\d)?/;
const formatDT_2 = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<hour>\d{2}):(?<minutes>\d{2})(:\d\d)?/;

function zero(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function datesEqual(date1, date2) {
  return (date1.getFullYear() == date2.getFullYear()) && (date1.getMonth() == date2.getMonth()) && (date1.getDate() == date2.getDate());
}

function setDefaults(obj, objDefaults) {
  const keys = Object.keys(objDefaults);
  for (let i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(obj, keys[i])) {
      obj[keys[i]] = objDefaults[keys[i]];
    }
  }
  return obj;
}

class DateTimePicker {
  constructor(selector, config) {
    if (!selector) {
      throw TypeError('Selector required to construct a DateTimePicker');
    }

    this.target = document.querySelector(selector);
    if (!this.target) {
      throw Error(`The selector '{selector}' doesn't give any results`);
    }
    this.target.addEventListener('click', () => {
      document.documentElement.classList.add('is-clipped');
      this.modal.classList.add('is-active');
      this.target.blur();
    });

    if (!['fr', 'en'].includes(config.lang)) {
      delete config.lang;
    }
    if (!['days', 'months'].includes(config.view)) {
      delete config.view;
    }

    this.config = setDefaults(config || {}, DateTimePicker.defaultConfig);
    this.date = DateTimePicker.parseDate(this.target.value) || new Date();
    this._selected = undefined;
    this._view = this.config.view;

    // Création du modal
    this.modal = document.createElement('div');
    this.modal.classList.add('modal');
    this.modal.innerHTML = `<div class="modal-background"></div><div class="modal-card"><header class="modal-card-head"><div class="field is-grouped has-addons is-flex-grow-1"><div class="control"><a class="button"><span class="icon"><i class="fas fa-chevron-left"></i></span></a></div><div class="control is-expanded"><a class="button is-fullwidth"></a></div><div class="control"><a class="button"><span class="icon"><i class="fas fa-chevron-right"></i></span></a></div></div></header><section class="modal-card-body"><div class="columns is-centered"><div class="column is-narrow"></div></div></section><footer class="modal-card-foot"><div class="field is-horizontal is-flex-grow-1"><div class="field-label is-normal"><label class="label">${_horaire[this.config.lang]}</label></div><div class="field-body"><div class="field has-addons"><div class="control"><div class="select is-left"><select><option>00</option><option>01</option><option>02</option><option>03</option><option>04</option><option>05</option><option>06</option><option>07</option><option>08</option><option>09</option><option>10</option><option>11</option><option>12</option><option>13</option><option>14</option><option>15</option><option>16</option><option>17</option><option>18</option><option>19</option><option>20</option><option>21</option><option>22</option><option>23</option></select></div></div><div class="control"><button class="button is-static has-text-primary"><b>h</b></button></div></div><div class="field has-addons"><div class="control"><div class="select"><select><option>00</option><option>05</option><option>10</option><option>15</option><option>20</option><option>25</option><option>30</option><option>35</option><option>40</option><option>45</option><option>50</option><option>55</option></select></div></div><div class="control"><button class="button is-static has-text-primary"><b>min</b></button></div></div><div class="field is-expanded"><button class="button is-primary is-fullwidth button-close">${_valider[this.config.lang]}</button></div></div></div></footer></div><button class="modal-close is-large" aria-label="close"></button>`;
    let _controls = this.modal.querySelectorAll('header a.button');
    this._leftArrow = _controls[0];
    this._menu = _controls[1];
    this._rightArrow = _controls[2];

    this._rightArrow.addEventListener('click', () => {
      switch (this._view) {
        case 'days':
          if (this._beginning.getMonth() == 11) {
            this._beginning.setFullYear(this._beginning.getFullYear() + 1, 0, 1);
          } else {
            this._beginning.setMonth(this._beginning.getMonth() + 1, 1);
          }
          break;
        case 'months':
          this._beginning.setFullYear(this._beginning.getFullYear() + 1);
          break;
      }
      this.refreshView();
    });

    this._leftArrow.addEventListener('click', () => {
      switch (this._view) {
        case 'days':
          if (this._beginning.getMonth() == 0) {
            this._beginning.setFullYear(this._beginning.getFullYear() - 1, 11, 1);
          } else {
            this._beginning.setMonth(this._beginning.getMonth() - 1, 1);
          }
          break;
        case 'months':
          this._beginning.setFullYear(this._beginning.getFullYear() - 1);
          break;
      }
      this.refreshView();
    });

    this._menu.addEventListener('click', () => {
      if (this._view == 'days') {
        this._view = 'months';
        this.refreshView();
      }
    });

    let _selects = this.modal.querySelectorAll('footer select');
    this._hour = _selects[0];
    this._minutes = _selects[1];

    this._hour.addEventListener('change', () => {
      this.date.setHours(this._hour.value);
      this.updateTarget();
    });

    this._minutes.addEventListener('change', () => {
      this.date.setMinutes(this._minutes.value);
      this.updateTarget();
    });

    document.body.appendChild(this.modal);

    this._beginning = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
    this.initTime();
    this.updateTarget();
    this.refreshView();
  }

  refreshView() {
    switch (this._view) {
      case 'days':
        this.showCalendarDays(this._beginning);
        break;
      case 'months':
        this.showCalendarMonths(this._beginning);
        break;
      default:
        throw Error('Invalid value for \'this._view\'');
    }
  }

  showCalendarDays(_beginning) {
    const days = _days[this.config.lang];
    const months = _months[this.config.lang];

    this._menu.innerHTML = `<b>${months[_beginning.getMonth()]} ${_beginning.getFullYear()}</b>`;

    const _body = this.modal.querySelector('.modal-card section .column');
    _body.innerHTML = `<table class="table has-text-centered is-narrow"><thead><tr><th>${days[0]}</th><th>${days[1]}</th><th>${days[2]}</th><th>${days[3]}</th><th>${days[4]}</th><th>${days[5]}</th><th>${days[6]}</th></tr></thead><tbody></tbody></table>`;

    // Création du tableau
    const _dayLength = 86400000;
    let day = new Date(_beginning.getTime() - _dayLength * ((_beginning.getDay() + 6) % 7));

    const _tbody = _body.querySelector('tbody');
    for (let i = 0; i < 6; i++) {
      if (i == 0 || (day.getMonth() <= _beginning.getMonth()) && day.getFullYear() <= _beginning.getFullYear()) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
          let cell = document.createElement('td');
          let _otherMonth = day.getMonth() != _beginning.getMonth();

          cell.innerHTML = `<span class="tag is-large${_otherMonth ? ' is-white has-text-grey' : ''} date-tag">${day.getDate()}</span>`;
          row.appendChild(cell);

          let _tag = cell.firstChild;
          if (datesEqual(day, new Date())) {
            _tag.classList.add('is-primary', 'is-light');
          }
          if (datesEqual(day, this.date)) {
            this._selected = _tag;
            _tag.classList.add('is-selected');
          }
          _tag.dataset.date = DateTimePicker.dayValue(day);

          _tag.addEventListener('click', () => {
            this.date = DateTimePicker.parseDay(_tag.dataset.date);
            this.date.setHours(this._hour.value, this._minutes.value);

            if (this.date.getMonth() != this._beginning.getMonth()) {
              this._beginning.setFullYear(this.date.getFullYear(), this.date.getMonth(), 1);
              this.refreshView();
            } else {
              if (this._selected != undefined) {
                this._selected.classList.remove('is-selected');
              }
              _tag.classList.add('is-selected');
              this._selected = _tag;
            }
            this.updateTarget();
          });
          day = new Date(day.getTime() + _dayLength);
        }
        _tbody.appendChild(row);
      }
    }
  }

  showCalendarMonths(_beginning) {
    const months = _months[this.config.lang];

    this._menu.innerHTML = `<b>${_beginning.getFullYear()}</b>`;
    let _body = this.modal.querySelector('.modal-card section .column');
    _body.innerHTML = `<table class="table"><tbody></tbody></table>`;

    const _tbody = _body.querySelector('tbody');
    for (let i = 0; i < 4; i++) {
      let row = document.createElement('tr');
      row.classList.add('py-5');

      for (let j = 0; j < 3; j++) {
        let cell = document.createElement('td');
        row.appendChild(cell);

        let _month = 3 * i + j;
        cell.innerHTML = `<span class="tag is-large month-tag">${months[_month]}`;

        let _tag = cell.firstChild;
        _tag.dataset.month = _month;
        _tag.addEventListener('click', () => {
          this._beginning.setMonth(_tag.dataset.month, 1);
          this._view = 'days';
          this.refreshView();
        });
      }
      _tbody.appendChild(row);
    }
  }

  updateTarget() {
    this.target.value = DateTimePicker.dateValue(this.date);
  }

  initTime() {
    let hour = zero(this.date.getHours());
    let _minutes = this.date.getMinutes();
    let minutes = zero(_minutes - (_minutes % 5));
    this._hour.value = hour;
    this._minutes.value = minutes;
    this.date.setMinutes(minutes);
  }

  static views = ['days', 'months'];

  static defaultConfig = {
    view: 'days',
    showTime: false,
    lang: 'fr',
  }

  static formatD = /(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})/;

  static parseDate(value) {
    const _vals = formatDT_1.exec(value) || formatDT_2.exec(value);
    return _vals === null ? undefined : new Date(_vals.groups.year, _vals.groups.month - 1, _vals.groups.day, _vals.groups.hour, _vals.groups.minutes);
  }

  static parseDay(value) {
    const _vals = DateTimePicker.formatD.exec(value);
    return _vals === null ? undefined : new Date(_vals.groups.year, _vals.groups.month - 1, _vals.groups.day);
  }

  static dateValue(value) {
    const _real = new Date(value.getTime() - 60000 * value.getTimezoneOffset());
    return _real.toISOString().replace('T', ' ').replace(/:\d{2}\.\d{3}Z/, '');
  }

  static dayValue(value) {
    return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`
  }
}
