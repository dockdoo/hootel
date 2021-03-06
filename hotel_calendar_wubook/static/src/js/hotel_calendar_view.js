/* global odoo, $ */
odoo.define('hotel_calendar_wubook.HotelCalendarViewWuBook', function (require) {
  'use strict';
  /*
   * Hotel Calendar WuBook View
   * GNU Public License
   * Aloxa Solucions S.L. <info@aloxa.eu>
   *     Alexandre Díaz <alex@aloxa.eu>
   */

  var HotelCalendarView = require('hotel_calendar.HotelCalendarView');
  var Model = require('web.DataModel');
  var Common = require('web.form_common');
  var Core = require('web.core');
  var Session = require('web.session');

  var _t = Core._t;
  var QWeb = Core.qweb;

  var _wubookNotifReservationsDomain = [
    ['to_assign', '=', true], ['to_read', '=', true]
  ];
  var _wubookIssuesDomain = [
    ['to_read', '=', true]
  ];

  var HotelCalendarViewWuBook = HotelCalendarView.include({
    _sounds: [],

    // Custom Constants
    SOUNDS: { NONE: 0, BOOK_NEW:1, BOOK_CANCELLED:2 },

    update_buttons_counter: function () {
      this._super();
      var self = this;

      // Cloud Reservations
      new Model('hotel.reservation').call('search_count', [_wubookNotifReservationsDomain]).then(function (count) {
        var $button = self.$el.find('#btn_channel_manager_request');
        var $text = self.$el.find('#btn_channel_manager_request .cloud-text');
        if (count > 0) {
          $button.addClass('incoming');
          $text.text(count);
          $text.show();
        } else {
          $button.removeClass('incoming');
          $text.hide();
        }
      });

      // Issues
      new Model('wubook.issue').call('search_count', [_wubookIssuesDomain]).then(function (count) {
        var $ninfo = self.$el.find('#pms-menu #btn_action_issues div.ninfo');
        var $badgeIssues = $ninfo.find('.badge');
        if (count > 0) {
          $badgeIssues.text(count);
          $badgeIssues.parent().show();
          $ninfo.show();
        } else {
          $ninfo.hide();
        }
      });
    },

    init: function(parent, dataset, fields_view, options) {
      this._super.apply(this, arguments);

      this._sounds[this.SOUNDS.BOOK_NEW] = new Audio('hotel_calendar_wubook/static/src/sfx/book_new.mp3');
      this._sounds[this.SOUNDS.BOOK_CANCELLED] = new Audio('hotel_calendar_wubook/static/src/sfx/book_cancelled.mp3');
    },

    init_calendar_view: function () {
      var self = this;
      return $.when(this._super()).then(function () {
        var deferredPromises = [];
        self.$el.find('#btn_channel_manager_request').on('click', function (ev) {
          self.call_action("hotel_calendar_wubook.hotel_reservation_action_manager_request");
        });

        return $.when.apply($, deferredPromises);
      });
    },

    _on_bus_signal: function (notifications) {
      for (var notif of notifications) {
        if (notif[0][1] === 'hotel.reservation') {
          if (notif[1]['type'] === 'issue') {
            if (notif[1]['userid'] === this.dataset.context.uid) {
              continue;
            }

            var issue = notif[1]['issue'];
            var qdict = issue;
            var msg = QWeb.render('HotelCalendarWuBook.NotificationIssue', qdict);
            if (notif[1]['subtype'] === 'notify') {
              this.do_notify(notif[1]['title'], msg, true);
            } else if (notif[1]['subtype'] === 'warn') {
              this.do_warn(notif[1]['title'], msg, true);
            }
          }
          else if (notif[1]['type'] === 'reservation') {
            var reserv = notif[1]['reservation'];
            if (reserv['wrid']) {
              if (notif[1]['action'] === 'create') {
                this._play_sound(this.SOUNDS.BOOK_NEW);
              } else if (notif[1]['action'] !== 'unlink' && reserv['state'] === 'cancelled') {
                this._play_sound(this.SOUNDS.BOOK_CANCELLED);
              }
            }
          }
        }
      }

      this._super(notifications);
    },

    _play_sound: function(/*int*/SoundID) {
      this._sounds[SoundID].play();
    },

    _generate_reservation_tooltip_dict: function(tp) {
      var qdict = this._super(tp);
      qdict['channel_name'] = tp[5];
      return qdict;
    },

    _generate_bookings_domain: function(tsearch) {
      var domain = this._super(tsearch);
      domain.splice(0, 0, '|');
      domain.push(['wrid', 'ilike', tsearch]);
      return domain;
    }
  });

  return HotelCalendarViewWuBook;
});
