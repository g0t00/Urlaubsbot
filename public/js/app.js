/* eslint-env browser */
/* global $ */
function deleteEntry (groupId, Uuid) {
  if (confirm('Really delete')) {
    window.location = `delete/${groupId}/${Uuid}`;
  }
}
$(() => {
  $('[contenteditable]').keypress(e => e.which !== 13);
  let saveEvt = event => {
    $.post('./edit', {
      id: $(event.target).parents('.members').data('id'),
      memberId: $(event.target).parents('.member').data('memberId'),
      uuid: $(event.target).parents('.entry').data('uuid'),
      description: $(event.target).parents('.entry').find('.description').val(),
      amount: $(event.target).parents('.entry').find('.amount').val()
    }).then(() => {
      window.location.reload();
    });
  };
  $('.save').click(saveEvt);
  $('.entry, amount').keypress(event => {
    if (event.which === 13) {
      saveEvt(event);
    }
  });
  $('.time').each((i, span) => {
    span = $(span);
    console.log(span.text());

    const date = new Date(parseInt(span.text(), 10));
    span.text(date.toLocaleString());
  });
  $('.sheet-export').click(event => {
    event.preventDefault();
    const $tar = $(event.target);
    $('.export-loading').css('display', 'inline-block');
    $.get($tar.attr('href')).then(() => {
      $('.export-loading').hide();
      $('.export-done').show();
    }).catch(err => {
      alert(JSON.stringify(err));
    })
  })
});
