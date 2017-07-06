(function(window, document, undefined) {
    var $window = $(window);
    /* Convenience methods in jQuery namespace.           */
    /* Use as  $.belowthefold(element, {threshold : 100, container : window}) */
    $.belowthefold = function(element, settings) {
        var fold;
        if (settings.container === undefined || settings.container === window) {
            fold = (window.innerHeight ? window.innerHeight : $window.height()) + $window.scrollTop();
        } else {
            fold = $(settings.container).offset().top + $(settings.container).height();
        }
        return fold <= $(element).offset().top - settings.threshold;
    };

    $.rightoffold = function(element, settings) {
        var fold;

        if (settings.container === undefined || settings.container === window) {
            fold = $window.width() + $window.scrollLeft();
        } else {
            fold = $(settings.container).offset().left + $(settings.container).width();
        }

        return fold <= $(element).offset().left - settings.threshold;
    };

    $.abovethetop = function(element, settings) {
        var fold;

        if (settings.container === undefined || settings.container === window) {
            fold = $window.scrollTop();
        } else {
            fold = $(settings.container).offset().top;
        }

        return fold >= $(element).offset().top + settings.threshold  + $(element).height();
    };

    $.leftofbegin = function(element, settings) {
        var fold;

        if (settings.container === undefined || settings.container === window) {
            fold = $window.scrollLeft();
        } else {
            fold = $(settings.container).offset().left;
        }

        return fold >= $(element).offset().left + settings.threshold + $(element).width();
    };

    $.inviewport = function(element, settings) {
         return !$.rightoffold(element, settings) && !$.leftofbegin(element, settings) &&
                !$.belowthefold(element, settings) && !$.abovethetop(element, settings);
     };

    $.fn.nextpage = function(options) {
        var elements = this;
        var $container;
        var settings = {
            threshold       : 0,
            failure_limit   : 0,
            event           : "scroll",
            effect          : "show",
            container       : window,
            data_attribute  : "original",
            skip_invisible  : true,
            appear          : null,
            loaded          : false,
            handnext        : 'next',
            callback        : null
        };

        function update() {
            var counter = 0;
            elements.each(function() {
                var $this = $(this);
                if (settings.skip_invisible
                    && ( $this.css("visibility") != "visible"
                        || $this.css("display") == "none"
                       )
                ) {
                    return;
                }
                if ($.abovethetop(this, settings) || $.leftofbegin(this, settings)) {
                        /* Nothing. */
                } else if (!$.belowthefold(this, settings) && !$.rightoffold(this, settings)) {
                    $this.trigger("appear");
                    /* if we found an image we'll load, reset the counter */
                    counter = 0;
                } else {
                    if (++counter > settings.failure_limit) {
                        return false;
                    }
                }
            });

        }

        if(options) {
            /* Maintain BC for a couple of versions. */
            if (undefined !== options.failurelimit) {
                options.failure_limit = options.failurelimit;
                delete options.failurelimit;
            }
            if (undefined !== options.effectspeed) {
                options.effect_speed = options.effectspeed;
                delete options.effectspeed;
            }

            $.extend(settings, options);
        }

        /* Cache container as jQuery as object. */
        $container = (settings.container === undefined ||
                      settings.container === window) ? $window : $(settings.container);

        /* Fire one scroll event per scroll. Not one scroll event per image. */
        if (0 === settings.event.indexOf("scroll")) {
            $container.bind(settings.event, function() {
                return update();
            });
        }

        this.each(function() {
            var self = this;
            var $self = $(self);

            self.loaded = settings.loaded;

            /* When appear is triggered load original image. */
            $self.one("appear", function() {
                if (!this.loaded) {
                    if (settings.appear) {
                        var elements_left = elements.length;
                        settings.appear.call(self, elements_left, settings);
                    }
                    // »Øµ÷
                    return settings.callback();
                }
            });

            /* When wanted event is triggered load original image */
            /* by triggering appear.                              */
            if (0 !== settings.event.indexOf("scroll")) {
                $self.bind(settings.event, function() {
                    if (!self.loaded) {
                        $self.trigger("appear");
                    }
                });
            }

            if ( 0 === settings.handnext.indexOf("next")) {
                $container.bind(settings.handnext, function() {
                    if (!self.loaded) {
                        $self.trigger("appear");
                    }
                });
            }
        });

        /* With IOS5 force loading images when navigating with back button. */
        /* Non optimal workaround. */
        if ((/(?:iphone|ipod|ipad).*os 5/gi).test(navigator.appVersion)) {
            $window.bind("pageshow", function(event) {
                if (event.originalEvent && event.originalEvent.persisted) {
                    elements.each(function() {
                        $(this).trigger("appear");
                    });
                }
            });
        }

        /* Force initial check if images should appear. */
        $(document).ready(function() {
            update();
        });
    };

    /* return element */
    $.fn.nextAll = function(){
      var $elements = this;
      var selector = arguments[0]?' ~ '+arguments[0]:'';
      return $($elements.selector + selector);
  }

  /* */
  $.fn.deploylist = function(options) {
    var $elements = this, // 当前元素
      // ajax的配置
      $acfg = {
        'type'      :   'post'
        ,'url'       :   ''
        ,'data'      :   {}
        ,'dataType'  :   'json'
        ,'async'     :   true
      },
      // ajax请求过程中效果配置
      $scfg = {
        's_type'    :     'insert' // 请求回的数据是追加(insert),或者替换(replace)
        ,'s_dom'     :     'body'  // 操作的dom
        ,'s_break'   :     true    // 是否终止之前未完成的ajax请求
        ,'s_warn'   :      ''      // 加载过程中的友好提示(class样式)
      },

      // 分页相关的配置以及提示
      $pcfg = {
          'p_info_dom'  :   'input[name="page"]'
          ,'p_empty_dom':   '.noinfo-box'
          ,'p_total_dom':   '.nearby-info'
          ,'p_total_desc':   '您附近有(X)家维修店'
          ,'is_clone':   true
      },

      $next = true;


    function __init__() {

      if(options.acfg) $acfg = merge($acfg,options.acfg);

      if(options.scfg) $scfg = merge($scfg,options.scfg);

      if(options.pcfg) $pcfg = merge($pcfg,options.pcfg);

      if(options.next) $next = options.next;

      if($elements.nextAll($pcfg['p_empty_dom']).length === 0) empty_dom();

      if($elements.nextAll($pcfg['p_info_dom']).length === 0) page_input();

      $elements.nextAll($pcfg['p_empty_dom']).hide(); // 隐藏空空
      $.ajax_list($acfg, $scfg, complete);
    }

    /* ---- 空样式 ---- */
    function empty_dom() {
      var empty_icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO4AAACUCAYAAACUVxWFAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDE0IDc5LjE1MTQ4MSwgMjAxMy8wMy8xMy0xMjowOToxNSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RjM1Q0U1MTVGNDlCMTFFNTk3MDJBRjFERDk5RDRDRkIiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RjM1Q0U1MTRGNDlCMTFFNTk3MDJBRjFERDk5RDRDRkIiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RjM1Q0U1MTBGNDlCMTFFNTk3MDJBRjFERDk5RDRDRkIiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RjM1Q0U1MTFGNDlCMTFFNTk3MDJBRjFERDk5RDRDRkIiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5/GodwAAAmdklEQVR42uydeYx82VXfz31LrV29/H7922d+M57dHtvYA7ZnbOzYAxlkYtbIiiI7QSCBgT+yOUoUEilE7AEHYxE2EwTYkAQECGRklmjANvZgY8947N+Mt1k885vf0vtSXXu993LOufdV33r9XtWr7qquqq57pKN6XVt3v3qf+p5z7rn3iiAIwJgxY9NlzqyfgOt/9W/MVXAEu/jI+2f2f3/s199y3L+ygP5G9JZlLj1jxqbG5tD/GfqiY86FsSOYixHLy/D25ej3ot+Dfh96HpX4G83pGarZ6vwuoX/agGssjS0rIO/VACVYCVo35vkfNqds6HYW/bspQke/acA1FloG/Q4F5D0anHR7OulFTuEMOMVz6GfBb1Wheu3v6e6Pm9M5dLsL/QH0d/F5N+dj5uyMBmSooPcp9Yy9Hiy3yGBKP9eB1c6fBmHZneetfvKnw8NPmNM8VLtN5bZ/h37DgHuy1fMuLbzV1XMpUT07YNItwXmebwncfuY3dqFdWWV+Mb/9svkIhmZUQH4b+qvR3935rMx5mWo7lxDavkwVM+LVcy6Ec19F7fwpEMI+9B/S2Ho2PDRh8nCNvnxfh/7H6C8acKfHshqYemhLPy8mqufc+QicZ/lnyy2M5I9sbj9nwB2+0ef7DvQ2+ge7Pl9zbibGLmhA3quFubclqmdmrhPOyrzzvAQU1ROTz2P945tbz5n8trfRZ3gJfUd5GvsW9PvRfwe9YsAdn+U0MO+B7iGW+aQXuXMXwGY4Q/UkNV0emXoOalRNbpWv0eE2+hfMx3zACNg3oD+E/gz6/0N/ts9rXo/+reifQn/0QERlzunIPigdzlBJb1PFhoPqmZ0HF6G0C92h7TjU8whh8icvPvJ+33z8XXYL+n9Ffy36X4AsNH0P+nvRv0anL+Y19CX+Y+hl9F+PTYXMeT205WPyzhDWUi/11MG01Rio5eSm9kRoYfLHzGXRZXQd/CD6Gvoj6Jsg2xb/BfqPo38A5BBPEHnNf0CnyvyvJNYwzLnta7fGhLaheorYZCa7oMA801XBtXNLE6+ehwP3WZPfxtu3oWPIBH+goCXbQ/8/CuC3qFDY017zM0pxfxa0KrIBt7dRTvEm6G7tm0tUz9JFLe8814FVTLF6DmqB14Tmzgt0WEX/nLmEuux29HX0L0W/69BX0F+hqS0N7f0UyBbS9yvFBQNufyP1/LA6gfvqmVvUGhL24bRzlHuKmT9pWn77GOa3LXMZdRnlqHeCHDFY1+6n8+Srx+n2X6K/E/1x9N8DWbjyDbjp7BsIWrd0CeZuf7iTgwona86MyW8Pax9RqdavKgWlVOLrIMfmvxNkEZN6j59A/zX0z6h8uK8ZcPeNigeQWboD8hfMjLS01jDjt72Mxsh+A51mXtB4LA0JfbPKYemYqsw0NPRV9C/2U1kDbg9ws6fvM2cibX7rt1Fxnwlztk+bMxJrLyqnIhS1oi6ALEqdR//v0H8814DbwwrqmxDBvcecjZTW2ukUPf8B89vapP+9d37ifYd63bNvfu8wfv2mcpr8QSHd+w4LLZlZukbaW4lZUlthueZspA6TzcSCAY2aMd6DTl9yf3aUNzLg6mHyqbvMmRjAmicf3P8yxPd6M/p/VHnsvz7qmxlwpf1jGSbfa85E+gQXGhs81Oip/O0kGc1n/qUhgEt80UVFk+B/FJ0mNlM31I2j/oEmx5Xl+lfQeK07f6s5G2nz292XwsMnMb/dPSH/FrWx/lOQfcI0t/mzh3gP6r6h6XhUhKKlgN4Ociz3T9B/c1h/qAE3HAZavMOciTRCG3jgN/f0/PZj41yb+pDrOn+vUkPqoKHCJOVINAmAqr16n/nP9HmfgoLdUV5SCks9ATT8Q1P5/hpkX/LmMP9vA26Y3y7P7jBQ4LcYRq9RxtuyOt7tPm7tgU+PtyrRl09jfnsT/f+CLBbFBhQgG/3/uM/7/COQs31oOSDqSabGClq/50n0nwQ5NjsSm2lwUSnoW/dbT2J+G3iNGBD3+GeviceNPYaR7g/a9QHeWQTCdn1hZwW+XqAEU38tjUn+L3XBT4NRTk59wlQk+i6ljnQtXFUK+cvoT6d4H6oOU6JP4cfz6guheRz/wKwr7jfRN2Vm4TLP6Jl089s1XpSNQSQIlRIylKyGSjUJRn8AhoTlE4yWnaMWT5ugtNw8WE4ebLcAVqYEdqYIVpZu54RluzYNm938+19CblsEwK+qi516bWmq2u/DAF1AY7KyUsWfPOwbPPSej/8t3vztOP74WQd37PltRxG7QCxrgJY79we+NwCMNoKY8WimkrAzFrodwmghhLZbJAjxC6tEK2lYCCI+xwGLxrHTTj1Ukyyor7tdWaV8jhY1+xD6b4Hsu32fKsoYM+AO1b5t2PltWLzxQxA1+Lzw/ub+MQ2rpBdGp41q6KMqBhLGrG05WctyCryMDasiwZghGPMWPoDPcel17MM2em+a1nfmwX/PY7q1lc/zbbu6Tl0sb1LeADlZnNr7/mqcH/aQOqAMuGPObyk2fgMr7tLdKYo3la48keFrhMdlCWcI40AXf6YlSBntbIAQClJGdJdAZCAzoTLOgWVnHQpRQ2XkLq8xTi0Ml3OlL6vs8svZyeprT0N95QmegODVNqhg8y3Kqyq0/Ck4eWO/Btxjsreiu7kzr4DG+tMSvk4xRx23lGoOUrwRIhBWpomqiKEqqqOdEaSMwkEYnZzFeSOCKMPVEuaUrosQuqyKI1TH4zQ6p+QS4qegdvMJqN3gIVEaPvl25ZRj0syYnwA5rc2YATd9mMzqsPZ0iuJNpongYaia4Yoq54yojHgs1ZFBpHC1hI+hdHZAdFEdnbGr4/ggvp996ZXvwvN8hcPp2g1eKIPGPL9HOa0O+VH0/4b+FYOlATcpTKby//cjcBSitlAdW5Q7WrKIgzC6GQxTLSrmyHyRijdOjkC0upTR7do7x1jvQlbu7KvYl175bqivfgEhfhLVmArR3Gn0z5VvoP8pyGrv8+bEJYB7zLtqU7mSqzEPvWes4/Y09natePkt1IpG5OWosOPI4Q6uuJplaVKwCOLwEJ/7BvalV70baghx/ebnWY1B7gz4A8ppXaY/QqfdxK6ZMz4+xb1ThUhPgaw2jsUuPvJ+D1W3yoWpwjK0ufJbYe+cmKyszjLImQIAGJAPfg0PIdoQFuTPvYZ9KfAZ3jop8Qo1H/H6Xz+qnMCl1RF/DlIu72LAHY5RdfH7QHanXAfZZTJ2c4vLkF24hVdz8LjDaI9Bbjek74M8z5VdqcgFAy0zJy8fGhICJz8ciM8/wL4YeEqFn+SwGuT6TO9VTstK0sJ+/wOG3ANswO02WuKUtlSgtYg/NinQRi9Ch1Z0RKdvmIMg77J3TlxugSEmZbaGcdFOad4qyfVH8NY2r/1FTsNxNYSYAK6vcvsvXUf/Gf3HMHKidsPfRv+fGEltG3CHa28EuardP4DsqJkKNekJcn2HvdEBeVGF13NTvSvBZH4WLhQuvo6d1J2Glwjg+toV+uagmT1UyPoJhJgq0rSr3W+eoKmGYwGXilG3g9wqkJqv/zfI8bupDAt7g7zNzs+1XXAyc3rjhKFvWJ+DnYHCpTew0+QIzokZ4qcIYmqBozbLn0eIqY5CS55+CCEuzxq49DjtzbmogPMGfH8KaWhSMl3RHzlJRYV+ILdqW+yyhpPpQOxkSgz2CTkL4/3tGNkULj3IThMw6qzEV6C+/jQJxqsofEb/AEL8cYT34VkBl2Cl9heaFEzbJFCL2pch/bQlWr2dOmRoziPNGHnqpBdqkkEuI8Sb7Ayyk5X5sWryn9ZOqUkaw6Y6Q+GWN7LTnGHOideuQGP9S/RHvm0WFJe+rWhSMC3hQbNnKFegOWLUiPqHCuB+1YjLINfZeZkKV2Zuz9S+IFc32OVFl+vkx+STCjL9D9SXzLOUfI9/nkSz3CIUb30T+zhX5zhOcCn2obL7d6O/GuRO2DQITtfeu5SCfh39pYT3o283at6nbQRprhxN8fqkycz6g9ysrANU5PYytpvvTLmjxpCwmX848HkMHxCE6jhQEO4fezTGI+/TniNouh9VkvGWjsNphtTLbfrHxguuq8IKUso/B7lFQhga06Dmj4BcEZGW/ajGvB8tQfmd6n1/T6mz2QjqUCCvIchrCuRCJz8mkAPKXBRgceDxY0G7A2GgQUjgcceTBiDfYtjbcYdaObPa43hfTCdZzeyrNDHg0rKUc6oI9XeRfJbCXVq6/qLKf3Vwswp4WtHuvCoKmEWyhwVyA0HeW8UPY1V7gWo4FHLNMwbMslidhWVxV5Nws2qCg70PobETCS7lrnR1PKRUdz0SBm8oVa7Bft/xgyBXx6NSPG1eRCvj3TSndjQg17a+DrlTt5kTZMDtMlLRz6v89hdB7qRNykstZrejnwW5ebGjwH6HApauLeqIom0VtsxpHR3Ik1UFMouETgq4oIpPVJSi3de+SxWrqLf4Ner4naro9EpVuLqi8uGrMPg4rzFjxoYELtX4qf9zTYW8bwU5JksD2F8C2f1EbWbU4E2Fpy+a0zjjFvjmHEwAuKHtqrCYQt9/h/4oyC0UPqOAtY3Cznj4Hq455TXMyTjuLCXh/nBYjlaKCNedpbVzPwv7wzsGWmPGJkRxaYt7Gu6hyjF1PuVU7vpRmJJZPcaMzQq4Ava7xalsSdXih9TP1JtMTRgvmVNl7ECobKrKYwU30H6mcVtqUfyUUt+rM5rfGzM22RevWrQthFfvhto54f97kVVDmC5bY9NnpgfO2BFiZZlhDbSnkTEDrrEJAdcz80hMnmdsBk0rswSBnHZI91FjB0+acM0pMuAaG5rgHrKqzBPweZphU+3jG4IrGFZq6AjaNX5c2FmwC+fAcufArG1twDV2XFpKEBKk1F2FkNI8Yb7l+5oMJ6mshFdINhnq/dU1aFE44Rbl7oW5U0aBDbjGRm1+c4fXgKJtSYEUlvuaAyWygS7fMT3Pgp/jt8oA6D4qvNWuoPqWeKE4ujXgGjM2CsUldaWwtx23YIrg5VaFk0cI5/G5DfDrG1yltjLzfD8rNoIvw+o2eNUV8MQaLw5nFy5wCE3hNMzYIgEGXGNHMCuMZZOf4RQ5NPZbuyok1rBFaJ3iJYQU4cPnEaQtAhXVmfJaO3uKwW9XrjGwgpbK4ZpVU6r47vP42hLY+bN4u9BZhseAa8xYT277DwfxGtKck8qwl9WRClAIJBW3QmWVYXPQgVvYObk8D8JNqupb6+DO38H3U9jtVW+qjcd3WM3pOfRepMIGXGPGeliqrjPh4vOcTh7rFC+ysrYrN/jWq63iU+ZkLtvcYxgZbMprXblLYhAWs9p1CWf+DMNKqkuv4yKX1YgKugHXmLEEKlM8RQ9fBUNKbqFqEqRtVE5hZVSumgE7h+GxV0eg1+QugKi6pKqktF59nZfLoWMCmVekdEsMsaCKs1s04BozNhxVjsDNTRVyydfwZw6Zswucp9L9FAq3y89LUKkZg5X6EipqwIUqv77JOTMB7BQvoHpfp/1IGHwDrjFjw1JlBa+EWKgwdy8kG6zcMirtckeZZe67IKvK+DwaQqLnCIZ6B9p7L7IaCzsvc2JarJ0nqNoGXGPGhh1Sk2JCuGh7OGbLKlrGuxc43A3aFQ6TrewiV5UJ8M5QEkFOQFNOTENEXo1B5iaOGeuqMuAaO3IYLNsW01ogx2Dzyzy+6yOUXmOL1ZZUl5otCEYqQNF9VIzy8TXtvZfAKZzj/DdQak1fAPR6DqdnzAy4xg5vqvWw97Q+0QUtFZWs7BI4VGAKWgghgltbwXx2Q1aJ1dYpehcVhcVUfQa/ISvI+BiBTUUtaqHkriwIDLjGjA0QAad/DofKbTk5garDtKSZW5KqSaFvJyS2ZGGKtBYhZmhRVb36Jr8hFaTs4iV+KoXVnTDcgGvM2GhMzicIOgUrUHmvFn+z2hKQElSIPA5ctGL4+X5/gG8RA64xYwPmwkIqKOWoarpeGD7TbB+e8YNO+W/ALZKVDrA07GO5BZXPBp3qMw8PUdcW3ooZm/FnwDU2+nhauLx5N/cXN7bAd+dk8UmFxTaGvnIMV6ghnja0yi/yc6mpgsJiORMobJXchz70GYuUDbjGjgFdmv2TW5YzfdQk+U4jBrObAZHVmicCd39LUOHwPNywuYJ7mLuDbznDiBV8dmTXrDll7AghsKNS0N5bkIQNFdCZAO/3hIw35VZhchAOF8XtT0Rjwl6Tq9R2dkHuA2zANWasD7hWOK3PTwG5rYHpy5UwepmKfTnfbe6qCfjdxs0ZGH6TCssZRkZxjRkbtjxzSExw+c0y5q/bvYHXq00xz6PxYAY6XLNqxnLcWQY3f+ACMTZCdXa4W4omw3P4yytdJKmuSIa4Q25b9SjnOnN3DbizYRkD7nGSa3P/MVeNZZyreowhNnftF36zamOoTC2RszSdz4BrbAyq63KFmKrJfrvGy9HwnNsItBwC6/dHxnp46RqaXOA19tecMuAaM5aaxEFfAFZuSVaYCdDG5oE+Yy5GNba61Thod1WueU4uTa6nMNkpwCyut2zANXakvJXD1nY9/QXnlniVCwqdedXG2iqHvfvgetxd1T3JoIHP2Qa5TE0d2tVVHi6y8+ekgs+gGXCNHf9F14HX4pDXq95Q60eFkbEfCY1VBdlr8WoXpNR27nRn6p8B15ix41BqXhP5HBeWyLzGNsJ7Xa5qwSp+8LLkSjQBTsNINE/XLc5Uw0XUTMujsTGp7hw4hQvQJjVt7fHwEC/4RvlvjLHaVlcoMOfXWai4s7yXkFFcY+PSXbUO8nk5nBMEqKirrKoQO0wkp//R4uf0mlnfP8gorrHxfe9TyJtdklDyAue03lRCoUsIXoPKKd4yU6s5GnCNjUA0tcnwh2bX4bWmSEEpFKZiVVzzBVWPndJlA60B19jRuVUT2r36Ed9IKq+LULarWbkcjbbqhZxdtKh6nY2ZHNfYZH0ROEVeT8rpymEFF6KoCj2rQz8Tq7iPPvrosf/O+8xnP5nw2jleEYNC4vbeVQXzpSO3NY7yGnv44YdNqGzMGPc0Zxd5fyHaiX4We5ENuMZGSdhIldddvMecY5PjGhs6XCbnNOAam17rvZOBMRMqG5vIUPnAnNoJ/Wuj3zcG3Cm73AxxM2m2BmsctMFMg3vnJ943+Iu0ttMPtl47alCFgXcmzVVwhm1Zvgbs1IF8UhVXxIAqtLzegDuUszxVpzGvYI16EAE6DuSJg3hSilP/akiw6m6p8Ch0+pLKKM8aeIdxwqeqtkl7mMyh08pyBQVyXl0L4XXhRK4ZK+a6Moqr7F3oP43+gSEqq9BOuh0DsT3Nyzu267v7G2kJSw7L0M+0djEfy39dmBUsdaNpSG3lVAZvqdvwZ919dRtEVHlilHic4NLV9W/Rfw5954jAWj2UNlTb0F11OzVXNU0ib1bXGFgGt7pFf34QfzoC7U65naUIf+yAHEIe3if24dePtS8F3omgc5/aiV79rmA6doQ/o2BtKViTbts9YA4iMItxATwOcAmkf4L+4+hhJerzhwDW0kC1NGUNwx1XAzXqmWCSwQ18aNU20bd4ITYaJ3Vzi5ApngE7WwKLprYFvmBweH9Zfx+gQAEV7r1Dj3W28/A67x+o1f870PG2IH74TaHu2t8qxO+M1Qad57Xr2/Iu2upy8u2sBi55M+G4FQN4qMy+BnEIr//oo4/ytfTwww8H0w7uvehb6p9eRF9GfwX6N6O/Hf1S5Pm/fARgHU1VDwCa5AKCgqyvTMa6RV5jF1rVTWg3K7xEqYOAOtl5cOYv8d6wB8+IJU+KiD9Jx2GtyhpUXvjYVEQtC/6L37hjXX4uBt5+HgezDrIYB8CjAvc70H8+nYSK38Xv8D9JAa0OqxUJfaOQZiOu3x8ej1Vxfa+BF/46tBFY32uC7eRYTfOF02BnitMxhW2KcmiEtqYEpN0D3kbkWPc4mNsRgFmFCeBRwzsqcH9B/YM/C+EePTE0vtY+/dgPZe/9Tz9c/dRhgY2DNKd5ErzHvmARhaSsqBhe+q2aXPkBQc2WLiCoc501iqfJpqxXeSmSw0YBToK2rnkczFGAfaW+MEr1HeXV8oFvd2/5bCVo//ZzfvmuFb/GIJ62snC/tQRvd28JLlvF8xQ2/2HxbTffWfkbvw+0urrqQOYVpHntOA5cXZWPgZKA1ZRg9Tj8bYOTWwA3vwT24mXMU81UtZFHNdpC6yCHgXwtT41CrKtpErg15eGx/jxdhWHU6jvSC/j7M3dv4s1e7FUtfUOdhDil1YtO+hhsTgO1APtjcoUYcPXw2dUKViP5v0lJW9UNzFPLMvx1i5yrZubO4XHBkHQceXf5OtTXrkBz8xlobH5VfyivF5Sgu1ocVWA9LI6CW9Vuw2NXPW6r17T1ItYo4B218qyh/5GCaE5BvKv+yevoH0F/MaK2utLamlJGYS2q99ThzcdAq8OqD6wPofjb4spvu7bN1V/LyWLYW4Lc/C3Tk6cOIceVe9SOyYKAAa2vPQXNrWcR3GuaOljtmji1tifO3oD9lkfdvYgKexGIo/DWItDS9VxRx456LNqokdRSOVngPvvm93aOH3/8caos/xr6RxVoeyqs8NSJWKd/GkNl2N7eBjg4Futq4XAB9jtf9C6YOejugol2wkSBFYcGN/D3w1/aCV3YmKfOdYZppjFPPRK3EILbPt4QGL8kG6iqBGvt5hNdj3mQqVXF8krZOn9zT1zY8MEORcGOgBTA/sSDOCXWQ+i8FhKH8O5FRMKNXGM6uJzzDlN1R3qlPfDAA74Khzd6PU8l8nqIHIbHIbQhrPPKS8r19jU9l3W197BigE0JboD5aZXHVL2GDH8pT3Vy85ClYRpn1vPU46sqt6trUF+9Ao2Nr6B/ueuxppjbqYgzK2VxYQWh3Un4IwPt5+h9+sQDR1Phtrqm9AJWXoGbg+6WSTcB2vB3eMMMmZ0JvBJCcMMKcEFBSntTLKrbEFw9r9VzWBu6K9Gpe03p27xd3+Hqr4fHYZ7qLt2m8lTTRhgNlUdlza3nZL6KIXBz5wU9BPbrYnG9Is6u7IhLKy1RrB/iW0bvfLK1L3S9O8pWt66COJNQ9AyFQv9CiE5k8IcZMk8auNEKck5T20XNdbXNxuSx0X7lxA+QwjwKf9uYq1L1l1YX5IJS6QI4mTmzJOhxpqv4WVD4S2FwA6H1avuBmg9uoypOr+6Jcyu71qU1H5yj9lkmgaxHfiFs0ZZZN6Z+IjTVjlatffV+3kkFFzRwM1puW4oJlQua0joQP5sj9kMqBqs0poeh1xc49KLclICl1QSF7SLEG4FlZwVtnGzZDq86SI9b+Bg/l392wKJbWv/XNPMf2jyMbEhVG+tP4+3T3RViUShXKF8VF1cwFN7u7s8eadwfQmxrCqyncNHaidCAjVal9SEiOGng6grZqzAVnZaViVHZRGBzwU7xjP/UfcVg/QJfGOXrvT9EaitkWDMh2D7YOV8eE8gZYdm2JZwsclwA4eYV3C6P09JrLf5SCIE3KwXxed95UVaBt5+FxuYzGi0iaIiFDcpXdzEEboj56piTd12FAzjYDKSrbFiJprBdHybS07ahFakm6UrSmy5s6G620MduczEFAasXsDY03LPeU3fPB9duFxBw7Fu89U0wf/d3YHi8Bz55S902y/v3YehMP/NxY5ua9K2ehS2aRcOQux3QpYpnCGbkNsMqbhPgmC/zPrEh4Hj/1Km46vPuu+ZU4EN9/UsK1uegvXdTC4GdVk0sYQh8nkLgVQ8y7Qm8JqMAQwy0Ta1olZT7imHluZNYnOo1ET4apkShFd1v5ltn/C/fvuh//S4L2rzxTOHi66F09zvAzspNlR0EBgrL6XKwdh2hViC3KnzL1eYO+BXeOZ1v6zvU5mj1+3f3IWfQA7wNCHKp4jkG3CLQee/YAis5zQ6SoLvjVfHOpl8HN+mic0KgsmNK0lUhhly1KpZvlq3zKwjsZgDWpK/3FAXY0opaTkL4bA9aGJ32HHcotui/cH7Z/8rLHagXOUw+cz/M3fEIZBZuO/ynh7BI0M+ker7frqFSlzWo95SalxX4ZfV4hXM9mqrX7wNW6q3BLiFmkBFyG1XcyhQV8AW+33ayfDvsQlu0V7m9dwNqq1QF/ho0NvSuJQqB57aoCoz56ioqbNkkDCcLXH1wXB8Mj+stdaB7XJbDECo8nfWfuj8blLkAlT11NxQvvwUyS3fIDZSPs8pGEDkU3Z9NB3qrGgnb95TCVzphPN9HoDfit6M8AFcHcrcDuVB/l51RcON5ITWnoa/Ol8CASr722C9Aq/yS9kFaHnUtEawYAq+0IN+cYk6CyHGvnuekyffBSQVXXzozrM6Fg956y1kmAm34P4hT/rO3nvKfuc+BRqcxuLH5NXaOa2h+69wFcNH3b89PzJ6roUqmB72SELZHQOfHdlOCbkMnL+eqOoXrOQk3KTqqOQOOt+GOeq29GyrZs9s1cfrmjnXLtUjX0kkBVm+VDPPahnZt6rOIwuvXg97Lwk41uHoHi15WD1vMwr5QNwJt+O3HucWmdeeL6FdtaGbyweZ8LtgpofLOu1ApZYLKPDR2XbqAaQio6yRgjuvMXUSQz0ugSxfBxvsmZZJ9MujFgaIIv1OIq8jwvCs/V+B3jhH0cIWLPtaG/N4N+zVPVsSZrRMSiQZ9osBoBbmirs89raLc0MDtNGKc1M6puCqdPlkgTPgDLRw50IDhQaa+J8430Df0nBHhzeVgm4HOBHulDOzNu0F1rl1dt9EPFFHc0iVWZKnMEmw7f2pqr0YrM8c+OOh73JzSqbCjU2N/u7IKGApfu2o/+MQJg1UXhajKtjVRCaGlnH1X3ZY1eMOZQkOPPJwJhDY6JqZXkMMTqp/A1C2PTVGsN6FY3xWXVrXPx8oFu4VcsFXKQhmBLs8j4CUX6sVW+Zqg2Sa1SIFKD7Xdkjw+7vx5XKBTwW3z8Q8ytHWxsP6S/fonTwiocerqx6hsC7qn+IWwUo/0tjquqOe0oHuC/YkuToUnqgkHh3vi8t+w8fswkwxo2UIfL8A9cvz5Rvi7LPAsghnVeQ6BRpjLJVTnktOu55vbzwN510WO+bPL6nxxIvPnYdn2Fz/MY7HU1XTVfuiz1Dc85aACdE8yCCICEne91SJqGyrurqa44QoZepHqxBanhHYShfrno1C3tKIAncDDTusTEL/YdaAKLV5VLG+r2SadSZ6YPzv5YEvlz7slPX9ucP781d75M7pdPDPx+XMstFd+n8dlKRW5aj346QlrlkgDalRVo8utJk3ra0L8tL4wty1rx3qOq0+on55pfUcsUnkJShyCq1eaDzORPmzwED0gPtDpghdra0+c2yTvyoeDajYPW/NZBvrk5c/bT/8BVK9/hod5MDz+dFPM1acE0iRYhz2RvqpVlpuRwlQwbStgHDVkjn5LxpXhD7t0jZWgxFYCwD3b1jB0rLegUAdxaU37s8VR8mcGu3Rx7Plz7cbnoPoSLegngpvWqx+viVPlCYIzCdKknHUUS9fUNWCjS9dM3WJxwwiZoyfdi3wbhifzMIvFJbVP2jF5cS+IIRlqEUTyZ76TWjEx3J7LBdulSc+fKZ/d+uKH+HjduufKjnV5ZUxgRuHsB6sfc+0c12Jx+pcETN1icUOAV1feduSk63lHVn37DbI8a1SBk5Q4bkJ+P1WOg7oDNoWbVXF6h1z/pzF/dvPBZiky/lzC/DkzjvyZVp3YePw3+BiBfWbduveFEcCY9Pwg4b4kNY2rBicp68iXZx0ltFISgvH3d4dr0Cb9jdrtMBdEz8QArFej7ZRqHG27TKvOkPJ+yp9zmD+XVP48j/kzKzQqdyyhw8ifqXd643O/oo/VPj4kJQ1S3t8LUogJfZNU1YtUh0e1IPqxADvpipukvl5MuV5X39RbkPSBNwliHd6kIlevyjUk/Ay91Brz5wrmzxXMn29G8uci5s/zFG5nOdyuoErX53rnz2HInZw/01jt1hd+Vxurfd0TcLjd6oIUShr0gDQa8iYVlfyIqibB2gvaw25B4kdrMtO8Bcmo8h99uEgH2NIATrXpV8Jx9DX6eyVBHAey1afgpUMOKULuGLgFQbWNrofbmD97lD9TuI0w7y5QdTsTVOftdr2QNn8uP/eX4Vjt7lX7occCsFs9AOxXIEpST4CDTfhJhSQ/AdResEabJuKgHcqmX8cJ7LSB2wtgfT0foU50uDB1r202426j9zkxw0lu5H2tSEidJrSO2xp00HA7NrRGyERVLNMSpav6Y7SYQCHYWsBwG313MQOVBQy3FzB/zsblzx5kqletN/wN3aYIcQ8T5iYVkXqFvn4EIn02TitmOKedoLbD2mbz2IGdVnDjAA40aPW1f/psbB2rpk4C5HHP098jznsVuXopcpI69wO6Z+7sYXpfFud30LuelAn2CqjQSznYWcoEZQS6esoKmoVr9jf9RVOUNlOA2m+stFcBKU5R44pKXoK3I7DGqW0b4qfeHXZj635RhwH3CIWPEGChQR2FJgloOwFMp8+tBQebPPqF0kkgixRVbCshZ+4HctcxrUmMfn0HboUUihqXk/opqrxBClB7hcJeTLja7nObdF8coH5MgWniYD1J4KaFWA+to0BYA0BtJeS4dorXpIW3F7hxsIojwhv0OYdJ0AYJEAd9QuG00Po9QPMSclx/ADj9mL8TJhnWkwpuGohBU+KociXloVZCztorn+2X7+rvbyf8vn6qe9iK9SDnL23lN43axnUuxT3eq2Lc67iXesYVk3qBOpGwzgK4/T6AOJC9HlAkqZ+V4mc74UtA9AmR46rRMbObEivTSarbS3EHKTr5kDy7JimX7VeM0u/zejyn104BQY9wN6nqPfGgziK4g4LcD4Jewzr9wtx+Y72HUVgrQV0Pq7a9VBcSwB1UgXuN0fa7D/qAGfQZmppKUA246T/AIEGl+o2zigjEkDI3jXttvyryoO2Wg56PQdoOez3mp6w8xxW8/D7V7F7h7omA1IB7dJh7Ad2rINRLDdN+EQwCaZqfD1MfSAvzoKClUckA+i+6FszKBWrAHR7QvR4fBLRe4A/6nqP6/9N0UB22R/ko5xkMuMaGCfQgz001/jqAiWP4nyAFfMGIf7cB19hYwT6pF7GBcYj2/wUYABVYd0aXm+ZMAAAAAElFTkSuQmCC";
      var empty_element = '<div class="p_empty_dom" style="padding: 60px 0;"><img src="'+empty_icon+'" style="display: block;margin: 0 auto;height: 74px;"><p style="margin-top: 15px;height: 20px;line-height: 20px;text-align: center;color: #999;">空空如也，暂无信息</p></div>';
      $elements.after(empty_element);
      $pcfg['p_empty_dom'] = '.p_empty_dom';
    }

    /* ---- 分页信息 ---- */
    function page_input() {
      var page_element = '<input type="hidden" name="page" value=\'{"totalRows":0,"listRows":0,"totalPages":0,"nowPage":0}\'>';
      $elements.after(page_element);
      $pcfg['p_info_dom'] = 'input[name="page"]';
    }

    function complete(e) {
      if(e.readyState === 4) {
        if( ! e.responseText) return false;
        var msg = JSON.parse(e.responseText);
        if(msg.status == 200) {
          // 获取到的新数据
          var datacontent = '';
          datacontent += options.loadList(msg.data);
          var total = 0;

          if(msg.page){
            var pageObj = {'totalRows':msg.page['totalRows'],'listRows':msg.page['listRows'],'totalPages':msg.page['totalPages'],'nowPage':msg.page['nowPage']};
            var pageStr = JSON.stringify(pageObj);
            $($pcfg['p_info_dom']).val(pageStr);
            total = msg.page['totalRows'];
            // 添加内容
            if($pcfg['is_clone'] == false ){
              if($scfg['s_type'] == 'replace'){
                 $elements.html(datacontent);
              }else{
                 $elements.append(datacontent);
              }
            }
            // 不存在数据
            if(msg.page['totalRows'] == 0){
              $elements.nextAll($pcfg['p_empty_dom']).show();
            }

            // 是否请求下一页
            if(msg.page['nowPage'] < msg.page['totalPages'] && $elements.children().length > 0 && $next){
              topage(parseInt(msg.page['nowPage'])+1);
            }
          }
          // 提示总数
          $($pcfg['p_total_dom']).html($pcfg['p_total_desc'].replace('(X)',total));
          if(total == 0 ){
            $elements.nextAll($pcfg['p_empty_dom']).show();
          }
        }
      }else{
        $elements.nextAll($pcfg['p_empty_dom']).show();
      }
    }

    // 分页测试
    function topage( nextPage ){
        $elements.children().last().nextpage({callback:function(){
            $scfg['s_type'] = 'insert';
            $acfg['url'] = $acfg['url'].replace(/(\/p\/\d+)?(\.html)?$/,'/p/'+nextPage+'.html');
            $.ajax_list($acfg, $scfg, complete)
        }});
    }

    function merge() {
      var merge;
      var numargs = arguments.length;
      if(numargs > 1){
        try{
          merge = Object.assign(arguments[0],arguments[1]);
        }catch(e){
          merge = $.extend(arguments[0],arguments[1]);
        }
      }else{
        merge = arguments[0];
      }
      return merge;
    }
    __init__();
  }

  $.ajax_list = (function() {
    /* --- AJAX 相关参数 --- */
    var acfg = {
      'type'      :   'post'
      ,'url'       :   ''
      ,'data'      :   {}
      ,'dataType'  :   'json'
      ,'async'     :   true
    }
    /* --- 效果 相关参数 --- */
    var scfg = {
      's_type'    :     'insert' // 请求回的数据是追加(insert),或者替换(replace)
      ,'s_dom'     :     'body'  // 操作的dom
      ,'s_break'   :     true   // 是否终止之前未完成的ajax请求
      ,'s_warn'   :      ''      // 加载过程中的友好提示(class样式)
    }
    var _callback = function(){}
    /* ---- 友好提示的样式 ---- */
    var warn_icon = "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D'0%200%20120%20120'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20xmlns%3Axlink%3D'http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink'%3E%3Cdefs%3E%3Cline%20id%3D'l'%20x1%3D'60'%20x2%3D'60'%20y1%3D'7'%20y2%3D'27'%20stroke%3D'%236c6c6c'%20stroke-width%3D'11'%20stroke-linecap%3D'round'%2F%3E%3C%2Fdefs%3E%3Cg%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(30%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(60%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(90%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(120%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(150%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.37'%20transform%3D'rotate(180%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.46'%20transform%3D'rotate(210%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.56'%20transform%3D'rotate(240%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.66'%20transform%3D'rotate(270%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.75'%20transform%3D'rotate(300%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.85'%20transform%3D'rotate(330%2060%2C60)'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";
    var warn_css = '<style>.preloader{display:inline-block;width:1.5rem;height:1.5rem;-webkit-transform-origin:50%;transform-origin:50%;-webkit-animation:preloader-spin 1s steps(12,end) infinite;animation:preloader-spin 1s steps(12,end) infinite}.preloader:after{display:block;content:"";width:100%;height:100%;background-image:url("'+warn_icon+'");background-position:50%;background-size:100%;background-repeat:no-repeat}</style>';
    $('head').append(warn_css);

    return function( $acfg , $scfg, $func) {
      acfg = merge(acfg,$acfg);
      scfg = merge(scfg,$scfg);
      $('.scroll-preloader').hide();
      if(scfg.s_break && typeof(xhr) !== 'undefined' && xhr !== null && typeof(xhr) === 'object') xhr.abort(); // 中断上一次请求
      xhr = $.ajax({
          type            :   acfg['type']
          ,url            :   acfg['url']
          ,data           :   acfg['data']
          ,dataType       :   acfg['dataType']
          ,async          :   acfg['async']
          ,beforeSend     :   function(e) {
            /* ---- 替换时提前清空dom ---- */
            if(scfg['s_type'] === 'replace'){
              $(scfg['s_dom']).html('');
            }

            /* ---- 友好提示 ---- */
            if($('.scroll-preloader').length >0){
              $('.scroll-preloader').eq(0).show();
            }else{
              var warn_str = '<div class="scroll-preloader" style="margin:.5rem;text-align:center;"><div class="preloader"></div></div>';
              $(scfg['s_dom']).append(warn_str);
            }
          }
          ,success        :   function(e) {
              // func(e); return;
          }
          ,error        :   function(e) {
              // func(e); return;
          }
          ,complete       :   function(e) {
            xhr = null;
            $('.scroll-preloader').remove();
            $func(e);
          }
      });
    }

    function merge() {
      var merge;
      var numargs = arguments.length;
      if(numargs > 1){
        try{
          merge = Object.assign(arguments[0],arguments[1]);
        }catch(e){
          merge = $.extend(arguments[0],arguments[1]);
        }
      }else{
        merge = arguments[0];
      }
      return merge;
    }
  })();
})(window, document);
