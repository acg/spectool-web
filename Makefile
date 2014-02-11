all : unpack-examples list-logs


WEB_SERVER_PORT ?= 9090

serve :
	@printf "Please visit http://127.0.0.1:%d/\n" "$(WEB_SERVER_PORT)"
	@( cd htdocs ; python -m SimpleHTTPServer $(WEB_SERVER_PORT) )


unpack-examples: htdocs/data/example/wispy.01.txt

htdocs/data/example/wispy.01.txt : htdocs/data/example/wispy.01.txt.gz
	gunzip -c < $< > $@


LOG_FILES = $(shell find -L htdocs/data -type f -a -not -name "*.gz" -a -not -name ".*" -a -not -name list.txt | sort)


list-logs : htdocs/data/list.txt

htdocs/data/list.txt : force $(LOG_FILES)
	@echo "rebuilding log file list..."
	@echo $^ | sed -e 's/^force //' | tr ' ' '\n' | sed -e 's@^htdocs/@@' > $@


.PHONY : force

