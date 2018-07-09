$(document).ready(function() {
    getDevices();

    $("#scan-devices").click(function(){
        $.ajax({
            type: 'GET',
            dataType: "json",
            url: 'api/discover',
            success: function(response) {
                getDevices();
            }
        });
    });

    $(".switch .slider").click(function(){
        var auto_id = $(this).parent().parent().attr('id');
        var auto_status = $(this).parent().children()[0].checked;

        var jsonObj = {};
        jsonObj[auto_id] = !auto_status

        $.ajax({
            type: 'POST',
            dataType: "json",
            data: jsonObj,
            url: 'api/auto',
            success: function(response) {
                console.log(response);
            }
        });
    });

    $(".connect-device").live('click', function(){
        var uuid = $(this).parent().attr('id');
        var deviceStatus = $(this).parent().parent();

        jsonObj = {"uuid": uuid};
        $.ajax({
            type: 'POST',
            dataType: "json",
            data: jsonObj,
            url: 'api/connect',
            success: function(response) {
                getDevices();
            }
        });
    });

    $(".disconnect-device").live('click', function(){
        var uuid = $(this).parent().attr('id');
        var deviceStatus = $(this).parent().parent();

        jsonObj = {"uuid": uuid};
        $.ajax({
            type: 'POST',
            dataType: "json",
            data: jsonObj,
            url: 'api/disconnect',
            success: function(response) {
                getDevices();
            }
        });
    });

});

function getDevices() {
    $.ajax({
        type: 'GET',
        dataType: "json",
        url: 'api/devices',
        success: function(response) {
            updateDevices(response);
        }
    });
}

function updateDevices(response) {
  console.log(response);
  var name = response;
  $('#devices-table tbody > tr').remove();
  jQuery.each(name, function(i,data) {
      dataStatus = "";
      dataStatusLabel = "";
      if (data.status == "disconnected") {
        dataStatus = data.status.charAt(0).toUpperCase() + data.status.slice(1);
        dataStatusLabel = "danger";
      }
      else if (data.status == "connected") {
        dataStatus = data.status.charAt(0).toUpperCase() + data.status.slice(1);
        dataStatusLabel = "success";
      }
      $("#devices-table").append("<tr> \
          <td><a href=\"\">"+ data.localName + "</a></td> \
          <td>" + i + "</td> \
          <td>" + data.address + "</td> \
          <td>" + data.rssi + "</td> \
          <td class=\"device-status\"><span class=\"label label-" + dataStatusLabel + " label-mini\">" + dataStatus + "</span></td> \
          <td id=" + i + "> \
               <button class=\"btn btn-success btn-xs connect-device\">Connect</button> \
               <button class=\"btn btn-danger btn-xs disconnect-device\">Disconnect</button> \
          </td> \
      </tr>");
  });
}
