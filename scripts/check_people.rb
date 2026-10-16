#!/usr/bin/env ruby
# Exercise the real Jekyll/Liquid templates without writing build artifacts.
# Run from the repository root: bundle exec ruby scripts/check_people.rb
require 'jekyll'
require 'cgi'
require 'tmpdir'

def require_check(condition, message)
  raise message unless condition
end

def names_from(html, css_class)
  html.scan(/<article class="#{css_class}">(.*?)<\/article>/m).flatten.map do |card|
    heading = card[/<h3>(.*?)<\/h3>/m, 1]
    CGI.unescapeHTML(heading.gsub(/<[^>]+>/, '').strip.sub(/\s*↗\z/, ''))
  end
end

Dir.mktmpdir('kojetin-people-check-') do |destination|
  %w[last_name seniority joined].product([false, true]).each do |mode, photos|
    site = Jekyll::Site.new(Jekyll.configuration(
      'source' => Dir.pwd, 'destination' => destination,
      'baseurl' => '/test-prefix', 'quiet' => true, 'disable_disk_cache' => true
    ))
    site.reset
    site.read
    site.data['people']['sort_by'] = mode
    site.data['people']['show_alumni_photos'] = photos
    members = site.collections['members'].docs
    # One missing date exercises unknown-last behavior without changing source.
    members.find { |m| m.data['name'] == 'Jinhui Dong' }.data.delete('joined_year')
    site.generate
    site.render
    html = site.pages.find { |p| p.url == '/people/' }.output
    key = {'last_name' => nil, 'seniority' => 'seniority', 'joined' => 'joined_year'}[mode]
    %w[current alumni].each do |status|
      expected = members.select { |m| m.data['status'] == status }.sort_by do |m|
        d = m.data
        [d['principal_investigator'] == true ? 0 : 1,
         key ? d.fetch(key, 9999) : 0, d['last_name'].downcase]
      end.map { |m| m.data['name'] }
      actual = names_from(html, status == 'current' ? 'member-card' : 'alumni-card')
      require_check(actual == expected, "#{mode}/#{photos}/#{status}: wrong order or missing/duplicate member\n#{actual.inspect}\n#{expected.inspect}")
    end
    require_check(names_from(html, 'member-card').first == 'Douglas Kojetin', 'PI must stay first')
    require_check(html.include?('/test-prefix/assets/css/people.css'), 'People stylesheet needs baseurl')
    alumni_html = html.split('<section class="alumni-section">', 2).last.split('</section>', 2).first
    photo_count = alumni_html.scan('class="alumni-portrait"').length
    require_check(photo_count == (photos ? members.count { |m| m.data['status'] == 'alumni' } : 0), 'Alumni portraits must follow setting')
    if photos
      require_check(alumni_html.include?('/test-prefix/assets/images/people/xiaoyu-yu.jpg'), 'Existing alumni photo lost')
      require_check(alumni_html.include?('member-placeholder'), 'Missing alumni photo needs initials')
    else
      require_check(!alumni_html.include?('<img'), 'Disabled alumni list must contain no headshots')
    end
    members.each do |member|
      output = member.output
      show = member.data['status'] == 'current' || photos
      require_check(output.include?('profile-without-photo') == !show, "#{member.data['name']}: wrong profile columns")
      portrait = output.include?('class="profile-photo"') || output.include?('member-placeholder profile-placeholder')
      require_check(portrait == show, "#{member.data['name']}: wrong profile photo visibility")
      require_check(output.include?('/test-prefix/assets/css/people.css'), 'Profile stylesheet needs baseurl')
      require_check(!output.include?('The source spells'), 'Editor note must remain private')
    end
    christopher = members.find { |m| m.data['name'] == 'Christopher Williams' }.output
    require_check(christopher.include?('Novartis') && christopher.include?('NIH F31DK134167'), 'Roster position or award missing')
    puts "PASS #{mode}, alumni photos #{photos}: #{members.size} profiles, complete ordered lists, PI first, photo visibility, missing date, baseurl"
  end
end
