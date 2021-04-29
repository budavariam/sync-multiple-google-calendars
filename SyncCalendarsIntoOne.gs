// Calendars to merge from.
// "[X]" is what is placed in front of your calendar event in the shared calendar.
// Use "" if you want none.
const CALENDARS_TO_MERGE = {
  '[Work]': 'calendar-id@gmail.com',
};
const keepEventDetails = false
// upon deleting past events, only remove the events with these prefixes
const DELETEPREFIXES = [
  '[Work]'
]
// upon creating new events, do not create events with these prefixes
const SKIPPREFIXES = [
  '[Personal]',
  '[Common]',
]
// The ID of the shared calendar
const CALENDAR_TO_MERGE_INTO = 'shared-calendar-id@gmail.com';

// Number of days in the future to run.
const DAYS_TO_SYNC = 30;

// ----------------------------------------------------------------------------
// DO NOT TOUCH FROM HERE ON
// ----------------------------------------------------------------------------
const SKIP_REQUESTS = false;
const DEBUG_EVENTS = false;
(function (r) {
  var BatchRequest;
  BatchRequest = (function () {
    var createRequest, parser;

    BatchRequest.name = "BatchRequest";

    function BatchRequest(p_) {
      var bP, batchPath;
      if (!p_.hasOwnProperty("requests")) {
        throw new Error("'requests' property was not found in object.");
      }
      this.p = p_.requests.slice();
      this.url = "https://www.googleapis.com/batch";
      if (p_.batchPath) {
        bP = p_.batchPath.trim();
        batchPath = "";
        if (~bP.indexOf("batch/")) {
          batchPath = bP.replace("batch", "");
        } else {
          batchPath = bP.slice(0, 1) === "/" ? bP : "/" + bP;
        }
        this.url += batchPath;
      }
      this.at = p_.accessToken || ScriptApp.getOAuthToken();
      this.lb = "\r\n";
      this.boundary = "xxxxxxxxxx";
      this.useFetchAll = "useFetchAll" in p_ ? p_.useFetchAll : false;
    }

    BatchRequest.prototype.Do = function () {
      var e, params, res;
      try {
        params = createRequest.call(this, this.p);
        res = UrlFetchApp.fetch(this.url, params);
      } catch (error) {
        e = error;
        throw new Error(e);
      }
      return res;
    };

    BatchRequest.prototype.EDo = function () {
      var e, i, j, k, limit, obj, params, ref, ref1, reqs, res, split;
      try {
        if (this.useFetchAll) {
          limit = 100;
          split = Math.ceil(this.p.length / limit);
          reqs = [];
          for (i = j = 0, ref = split; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
            params = createRequest.call(this, this.p.splice(0, limit));
            params.url = this.url;
            reqs.push(params);
          }
          r = UrlFetchApp.fetchAll(reqs);
          res = r.reduce(function (ar, e) {
            var obj;
            if (e.getResponseCode() !== 200) {
              ar.push(e.getContentText());
            } else {
              obj = parser.call(this, e.getContentText());
              ar = ar.concat(obj);
            }
            return ar;
          }, []);
        } else {
          limit = 100;
          split = Math.ceil(this.p.length / limit);
          res = [];
          for (i = k = 0, ref1 = split; 0 <= ref1 ? k < ref1 : k > ref1; i = 0 <= ref1 ? ++k : --k) {
            params = createRequest.call(this, this.p.splice(0, limit));
            r = UrlFetchApp.fetch(this.url, params);
            if (r.getResponseCode() !== 200) {
              res.push(r.getContentText());
            } else {
              obj = parser.call(this, r.getContentText());
              res = res.concat(obj);
            }
          }
        }
      } catch (error) {
        e = error;
        throw new Error(e);
      }
      return res;
    };

    parser = function (d_) {
      var regex, temp;
      temp = d_.split("--batch");
      regex = /{[\S\s]+}/g;
      return temp.slice(1, temp.length - 1).map(function (e) {
        if (regex.test(e)) {
          return JSON.parse(e.match(regex)[0]);
        }
        return e;
      });
    };

    createRequest = function (d_) {
      var contentId, data, e, params;
      try {
        contentId = 0;
        data = "--" + this.boundary + this.lb;
        d_.forEach((function (_this) {
          return function (e) {
            data += "Content-Type: application/http" + _this.lb;
            data += "Content-ID: " + ++contentId + _this.lb + _this.lb;
            data += e.method + " " + e.endpoint + _this.lb;
            data += e.accessToken ? "Authorization: Bearer " + e.accessToken + _this.lb : "";
            data += e.requestBody ? "Content-Type: application/json; charset=utf-8" + _this.lb + _this.lb : _this.lb;
            data += e.requestBody ? JSON.stringify(e.requestBody) + _this.lb : "";
            return data += "--" + _this.boundary + _this.lb;
          };
        })(this));
        params = {
          muteHttpExceptions: true,
          method: "post",
          contentType: "multipart/mixed; boundary=" + this.boundary,
          payload: Utilities.newBlob(data).getBytes(),
          headers: {
            Authorization: 'Bearer ' + this.at
          }
        };
      } catch (error) {
        e = error;
        throw new Error(e);
      }
      return params;
    };

    return BatchRequest;

  })();
  return r.BatchRequest = BatchRequest;
})(this);

/**
 * GitHub  https://github.com/tanaikech/BatchRequest<br>
 * Run BatchRequest<br>
 * @param {Object} Object Object
 * @return {Object} Return Object
 */
function Do(object) {
  return new BatchRequest(object).Do();
}

/**
 * Run enhanced "Do" method of BatchRequest. Requests more than 100 can be used and the result values are parsed.<br>
 * @param {Object} Object Object
 * @return {Object} Return Object
 */
function EDo(object) {
  if (SKIP_REQUESTS) {
    console.log("SKIP request", object)
    return
  }
  return new BatchRequest(object).EDo();
}

// Delete any old events that have been already cloned over.
// This is basically a sync w/o finding and updating. Just deleted and recreate.
function deleteEvents(startTime, endTime) {
  const sharedCalendar = CalendarApp.getCalendarById(CALENDAR_TO_MERGE_INTO);
  const events = sharedCalendar.getEvents(startTime, endTime);
  const requestBody = events
    .filter((e, i) => {
      if (!e || !e.getTitle) {
        return false;
      }
      const eventTitle = e.getTitle() || ''
      const shouldDelete = DELETEPREFIXES.some((key) => eventTitle.startsWith(key))
      if (DEBUG_EVENTS) {
        console.info("DEBUG: DelEvent", {shouldDelete, eventTitle})
      }
      return shouldDelete
    })
    .map((e, i) => ({
      method: 'DELETE',
      endpoint: `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_TO_MERGE_INTO}/events/${e
        .getId()
        .replace('@google.com', '')}`,
    }));
  if (requestBody && requestBody.length) {
    const result = EDo({
      useFetchAll: true,
      batchPath: 'batch/calendar/v3',
      requests: requestBody,
    });
    console.log(`${requestBody.length} deleted events.`);
  } else {
    console.log('No events to delete.');
  }
}

function createEvents(startTime, endTime) {
  let requestBody = [];

  for (let calendarName in CALENDARS_TO_MERGE) {
    const calendarId = CALENDARS_TO_MERGE[calendarName];
    const calendarToCopy = CalendarApp.getCalendarById(calendarId);

    if (!calendarToCopy) {
      console.log("Calendar not found: '%s'.", calendarId);
      continue;
    }

    // Find events
    const events = Calendar.Events.list(calendarId, {
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // If nothing find, move to next calendar
    if (!(events.items && events.items.length > 0)) {
      continue;
    }

    events.items.forEach((event) => {
      // Don't copy "free" events.
      if ((!event) || (event.transparency && event.transparency === 'transparent')) {
        return;
      }
      const shouldSkip = SKIPPREFIXES.some((key) => (event.summary || "").startsWith(key))
      const eventTitle = `${calendarName} ${keepEventDetails ? (event.summary || "busy") : "busy"}`
      if (DEBUG_EVENTS) {
        console.info("DEBUG: CreateEvent", {shouldSkip, incomingSummary: event.summary, newTitle: eventTitle})
      }
      if (shouldSkip) {
        return
      }

      requestBody.push({
        method: 'POST',
        endpoint: `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_TO_MERGE_INTO}/events`,
        requestBody: {
          summary: eventTitle,
          location: keepEventDetails ? event.location : undefined,
          description: keepEventDetails ? event.description : undefined,
          reminders: {
            useDefault: false,
            overrides: [],
          },
          start: event.start,
          end: event.end,
        },
      });
    });
  }

  if (requestBody && requestBody.length) {
    const result = EDo({
      batchPath: 'batch/calendar/v3',
      requests: requestBody,
    });
    console.log(`${requestBody.length} events created via BatchRequest`);
  } else {
    console.log('No events to create.');
  }
}

function SyncCalendarsIntoOne() {
  // Midnight today
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  const endTime = new Date(startTime.valueOf());
  endTime.setDate(endTime.getDate() + DAYS_TO_SYNC);

  deleteEvents(startTime, endTime);
  createEvents(startTime, endTime);
}