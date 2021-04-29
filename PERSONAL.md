# How can I use it

## First usecase

Sync between personal calendar and work calendar.

Problem: when connecting external tools to read calendar details,
or other colleagues want to schedule meetings with me,
they don't see my whole schedule, and might create meetings where I already have plans.
I'd prefer to keep my personal events out of my work calendar, they don't need to know the details.

In personal calendar:

- work events should show up as `[Work] busy`
- personal events should be intact
- sync data for 14 days ahead
- there should be no duplicated events

In work calendar:

- personal events should show up as `[Personal] busy`
- work events should be intact
- sync data for 14 days ahead
- there should be no duplicated events

### Steps to take

- create the code and set up cron according to the readme in [scripts.google.com](scripts.google.com)
- share the calendars between the accounts with event details (edit is not needed)
- update the optional variables

  ```js
  // PERSONAL
  const CALENDARS_TO_MERGE = {
    '[Work]': 'WORKMAILCALENDARID',
  };
  const keepEventDetails = false
  const DELETEPREFIXES = [
    '[Work]'
  ]
  const SKIPPREFIXES = [
    '[Personal]'
  ]
  const CALENDAR_TO_MERGE_INTO = 'PERSONALMAILCALENDARID';
  const DAYS_TO_SYNC = 14;

  // WORK
  const CALENDARS_TO_MERGE = {
    '[Personal]': 'PERSONALMAILCALENDARID',
  };
  const keepEventDetails = false
  const DELETEPREFIXES = [
    '[Personal]'
  ]
  const SKIPPREFIXES = [
    '[Work]'
  ]
  const CALENDAR_TO_MERGE_INTO = 'WORKMAILCALENDARID';
  const DAYS_TO_SYNC = 14;
  ```
