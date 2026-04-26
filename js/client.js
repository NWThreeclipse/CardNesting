/* Card Nesting Power-Up for Trello
   Threeclipse Inc. — v1.0
   Allows parent-child card grouping with visual indicators
   Shared helpers are in nesting.js (loaded by popup/section iframes only). */

TrelloPowerUp.initialize({

  // ── Card Buttons (right side of card back) ──
  'card-buttons': function (t) {
    return t.card('id').then(function (card) {
      return t.get(card.id, 'shared', 'nesting').then(function (raw) {
        var data = raw || {};
        var buttons = [];

        if (data.isChild) {
          buttons.push({
            icon: 'https://cdn-icons-png.flaticon.com/16/9961/9961218.png',
            text: 'Unlink from Parent',
            callback: function (tc) {
              return tc.get(card.id, 'shared', 'nesting').then(function (fresh) {
                fresh = fresh || {};
                if (!fresh.parentId) {
                  return tc.alert({ message: 'Already unlinked.', duration: 3 });
                }
                var parentId = fresh.parentId;
                return tc.get(parentId, 'shared', 'nesting').then(function (pData) {
                  pData = pData || {};
                  pData.childIds = (pData.childIds || []).filter(function (id) { return id !== card.id; });
                  if (pData.childIds.length === 0) pData.isParent = false;
                  return tc.set(parentId, 'shared', 'nesting', pData);
                }).then(function () {
                  fresh.parentId = null;
                  fresh.isChild = false;
                  return tc.set(card.id, 'shared', 'nesting', fresh);
                }).then(function () {
                  tc.alert({ message: 'Unlinked from parent card.', duration: 3 });
                });
              }).catch(function () {
                tc.alert({ message: 'Failed to unlink. Please try again.', duration: 3 });
              });
            }
          });
        }

        if (!data.isChild) {
          buttons.push({
            icon: 'https://cdn-icons-png.flaticon.com/16/10613/10613585.png',
            text: 'Add Children',
            callback: function (tc) {
              return tc.popup({
                title: 'Select Children',
                url: './pages/add-children.html',
                height: 400
              });
            }
          });
        }

        if (!data.isChild && !data.isParent) {
          buttons.push({
            icon: 'https://cdn-icons-png.flaticon.com/16/7268/7268647.png',
            text: 'Set Parent',
            callback: function (tc) {
              return tc.popup({
                title: 'Select Parent Card',
                url: './pages/set-parent.html',
                height: 400
              });
            }
          });
        }

        return buttons;
      });
    }).catch(function () {
      return [];
    });
  },

  // ── Card Badges (front of card in list view) ──
  'card-badges': function (t) {
    return t.card('id').then(function (card) {
      return t.get(card.id, 'shared', 'nesting').then(function (raw) {
        var data = raw || {};
        var badges = [];

        if (data.isParent) {
          var count = (data.childIds || []).length;
          badges.push({
            text: count + (count === 1 ? ' child' : ' children'),
            color: 'blue'
          });
        }

        if (data.isChild) {
          badges.push({
            text: 'Child',
            color: 'sky'
          });
        }

        return badges;
      });
    }).catch(function () {
      return [];
    });
  },

  // ── Card Detail Badges (card back, below title) ──
  'card-detail-badges': function (t) {
    return t.card('id').then(function (card) {
      return t.get(card.id, 'shared', 'nesting').then(function (raw) {
        var data = raw || {};
        var badges = [];

        if (data.isParent) {
          var count = (data.childIds || []).length;
          badges.push({
            title: 'Children',
            text: count + (count === 1 ? ' card' : ' cards'),
            color: 'blue',
            callback: function (tc) {
              return tc.popup({
                title: 'Child Cards',
                url: './pages/view-children.html',
                height: 300
              });
            }
          });
        }

        if (data.isChild) {
          badges.push({
            title: 'Parent',
            text: 'View Parent',
            color: 'sky',
            callback: function (tc) {
              return tc.popup({
                title: 'Parent Card',
                url: './pages/view-parent.html',
                height: 200
              });
            }
          });
        }

        return badges;
      });
    }).catch(function () {
      return [];
    });
  },

  // ── Card Back Section (display-only) ──
  'card-back-section': function (t) {
    return t.card('id').then(function (card) {
      return t.get(card.id, 'shared', 'nesting').then(function (raw) {
        var data = raw || {};
        var childCount = (data.childIds || []).length;
        var baseHeight = 40;
        if (data.isParent) baseHeight = Math.min(40 + childCount * 36, 500);
        else if (data.isChild) baseHeight = 60;

        return {
          title: 'Card Nesting',
          icon: '',
          content: {
            type: 'iframe',
            url: t.signUrl('./pages/card-section.html'),
            height: baseHeight
          }
        };
      });
    });
  },

  // ── Board Buttons ──
  'board-buttons': function (t) {
    return [{
      icon: {
        dark: 'https://cdn-icons-png.flaticon.com/16/10613/10613585.png',
        light: 'https://cdn-icons-png.flaticon.com/16/10613/10613585.png'
      },
      text: 'Card Nesting',
      callback: function (tc) {
        return tc.popup({
          title: 'Card Nesting — Threeclipse',
          url: './pages/board-overview.html',
          height: 400
        });
      }
    }];
  }

}, {
  appKey: '',
  appName: 'Card Nesting by Threeclipse'
});
